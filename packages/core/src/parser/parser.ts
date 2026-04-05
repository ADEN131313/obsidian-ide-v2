import type {
  Token, TokenType, ParseError, ParseResult, Program, Statement,
  Expression, VariableDeclaration, FunctionDeclaration, IfStatement,
  WhileStatement, ReturnStatement, ExpressionStatement, BlockExpression,
  BinaryExpression, UnaryExpression, LiteralExpression, IdentifierExpression,
  CallExpression, AssignmentExpression, Parameter
} from "../types/ast.js";

/**
 * Recursive Descent Parser with error recovery
 */
export class Parser {
  private tokens: Token[];
  private position = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult<Program> {
    const body: Statement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        body.push(stmt);
      } else {
        this.synchronize(); // Error recovery
      }
    }

    return {
      success: this.errors.length === 0,
      value: {
        type: "Program",
        body,
        loc: this.createLoc(0, this.tokens.length - 1)
      },
      errors: this.errors
    };
  }

  private parseStatement(): Statement | null {
    this.skipCommentsAndWhitespace();

    if (this.match("KEYWORD", "fn")) {
      return this.parseFunctionDeclaration();
    }

    if (this.match("KEYWORD", "let")) {
      return this.parseVariableDeclaration();
    }

    if (this.match("KEYWORD", "if")) {
      return this.parseIfStatement();
    }

    if (this.match("KEYWORD", "while")) {
      return this.parseWhileStatement();
    }

    if (this.match("KEYWORD", "return")) {
      return this.parseReturnStatement();
    }

    return this.parseExpressionStatement();
  }

  private parseFunctionDeclaration(): FunctionDeclaration | null {
    const startPos = this.position - 1;
    
    const name = this.expect("IDENTIFIER", "Function name expected");
    if (!name) return null;

    if (!this.expectPunctuation("(")) return null;

    const parameters = this.parseParameters();

    if (!this.expectPunctuation(")")) return null;

    // Optional return type
    let returnType: string | undefined;
    if (this.matchPunctuation("->")) {
      const typeTok = this.expect("KEYWORD", "Return type expected");
      if (typeTok) returnType = typeTok.value;
    }

    const body = this.parseBlock();
    if (!body) return null;

    return {
      type: "FunctionDeclaration",
      name: name.value,
      parameters,
      returnType,
      body,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseVariableDeclaration(): VariableDeclaration | null {
    const startPos = this.position - 1;

    const name = this.expect("IDENTIFIER", "Variable name expected");
    if (!name) return null;

    // Optional type annotation
    let valueType: string | undefined;
    if (this.matchPunctuation(":")) {
      const typeTok = this.expect("KEYWORD", "Type annotation expected");
      if (typeTok) valueType = typeTok.value;
    }

    let initializer: Expression;
    if (this.matchPunctuation("=")) {
      const expr = this.parseExpression();
      if (!expr) return null;
      initializer = expr;
    } else {
      // Default initialization based on type
      initializer = {
        type: "Literal",
        value: 0,
        raw: "0",
        loc: this.createLoc(startPos, startPos)
      };
    }

    this.expectPunctuation(";");

    return {
      type: "VariableDeclaration",
      name: name.value,
      valueType,
      initializer,
      mutable: true,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseIfStatement(): IfStatement | null {
    const startPos = this.position - 1;

    if (!this.expectPunctuation("(")) return null;

    const condition = this.parseExpression();
    if (!condition) return null;

    if (!this.expectPunctuation(")")) return null;

    const consequent = this.parseBlock();
    if (!consequent) return null;

    let alternate: BlockExpression | IfStatement | undefined;
    if (this.match("KEYWORD", "else")) {
      if (this.check("KEYWORD", "if")) {
        this.advance();
        alternate = this.parseIfStatement() || undefined;
      } else {
        alternate = this.parseBlock() || undefined;
      }
    }

    return {
      type: "IfStatement",
      condition,
      consequent,
      alternate,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseWhileStatement(): WhileStatement | null {
    const startPos = this.position - 1;

    if (!this.expectPunctuation("(")) return null;

    const condition = this.parseExpression();
    if (!condition) return null;

    if (!this.expectPunctuation(")")) return null;

    const body = this.parseBlock();
    if (!body) return null;

    return {
      type: "WhileStatement",
      condition,
      body,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseReturnStatement(): ReturnStatement | null {
    const startPos = this.position - 1;

    let argument: Expression | undefined;
    if (!this.checkPunctuation(";")) {
      argument = this.parseExpression() || undefined;
    }

    this.expectPunctuation(";");

    return {
      type: "ReturnStatement",
      argument,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseExpressionStatement(): ExpressionStatement | null {
    const startPos = this.position;
    const expr = this.parseExpression();
    if (!expr) return null;

    this.expectPunctuation(";");

    return {
      type: "ExpressionStatement",
      expression: expr,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseBlock(): BlockExpression | null {
    const startPos = this.position;

    if (!this.expectPunctuation("{")) return null;

    const statements: Statement[] = [];
    
    while (!this.checkPunctuation("}") && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    if (!this.expectPunctuation("}")) return null;

    return {
      type: "BlockExpression",
      statements,
      loc: this.createLoc(startPos, this.position - 1)
    };
  }

  private parseParameters(): Parameter[] {
    const params: Parameter[] = [];

    while (!this.checkPunctuation(")") && !this.isAtEnd()) {
      const name = this.expect("IDENTIFIER", "Parameter name expected");
      if (!name) break;

      let type: string | undefined;
      if (this.matchPunctuation(":")) {
        const typeTok = this.expect("KEYWORD", "Parameter type expected");
        if (typeTok) type = typeTok.value;
      }

      params.push({
        name: name.value,
        type,
        loc: this.createLoc(this.position - 2, this.position - 1)
      });

      if (!this.matchPunctuation(",")) break;
    }

    return params;
  }

  // Expression parsing with precedence climbing
  private parseExpression(): Expression | null {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression | null {
    const left = this.parseLogicalOr();
    if (!left) return null;

    if (this.matchPunctuation("=")) {
      const right = this.parseAssignment();
      if (!right) return null;

      if (left.type !== "Identifier") {
        this.addError("Invalid assignment target", left.loc.start.line, left.loc.start.column, "error");
        return null;
      }

      return {
        type: "AssignmentExpression",
        operator: "=",
        left: left as IdentifierExpression,
        right,
        loc: { start: left.loc.start, end: right.loc.end }
      };
    }

    return left;
  }

  private parseLogicalOr(): Expression | null {
    return this.parseBinary(this.parseLogicalAnd, ["||"]);
  }

  private parseLogicalAnd(): Expression | null {
    return this.parseBinary(this.parseEquality, ["&&"]);
  }

  private parseEquality(): Expression | null {
    return this.parseBinary(this.parseComparison, ["==", "!="]);
  }

  private parseComparison(): Expression | null {
    return this.parseBinary(this.parseAdditive, ["<", ">", "<=", ">="]);
  }

  private parseAdditive(): Expression | null {
    return this.parseBinary(this.parseMultiplicative, ["+", "-"]);
  }

  private parseMultiplicative(): Expression | null {
    return this.parseBinary(this.parseUnary, ["*", "/", "%"]);
  }

  private parseUnary(): Expression | null {
    if (this.match("OPERATOR", "-") || this.match("OPERATOR", "!")) {
      const op = this.previous();
      const operand = this.parseUnary();
      if (!operand) return null;

      return {
        type: "UnaryExpression",
        operator: op.value,
        operand,
        loc: { 
          start: { line: op.line, column: op.column, offset: op.start }, 
          end: operand.loc.end 
        }
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression | null {
    let expr = this.parsePrimary();
    if (!expr) return null;

    while (this.matchPunctuation("(")) {
      // Function call
      const args = this.parseArguments();
      if (!this.expectPunctuation(")")) return null;

      if (expr!.type !== "Identifier") {
        this.addError("Callee must be an identifier", expr!.loc.start.line, expr!.loc.start.column, "error");
        return null;
      }

      expr = {
        type: "CallExpression",
        callee: expr! as IdentifierExpression,
        arguments: args,
        loc: { 
          start: expr!.loc.start, 
          end: { line: this.previous().line, column: this.previous().column, offset: this.previous().end } 
        }
      };
    }

    return expr;
  }

  private parsePrimary(): Expression | null {
    const startPos = this.position;
    const tok = this.peek();

    if (this.match("NUMBER")) {
      const value = tok.value.includes(".") ? parseFloat(tok.value) : parseInt(tok.value, 10);
      return {
        type: "Literal",
        value,
        raw: tok.value,
        loc: this.createLoc(startPos, startPos)
      };
    }

    if (this.match("STRING")) {
      return {
        type: "Literal",
        value: tok.value,
        raw: `"${tok.value}"`,
        loc: this.createLoc(startPos, startPos)
      };
    }

    if (this.match("BOOLEAN")) {
      return {
        type: "Literal",
        value: tok.value === "true",
        raw: tok.value,
        loc: this.createLoc(startPos, startPos)
      };
    }

    if (this.match("IDENTIFIER")) {
      return {
        type: "Identifier",
        name: tok.value,
        loc: this.createLoc(startPos, startPos)
      };
    }

    if (this.matchPunctuation("(")) {
      const expr = this.parseExpression();
      if (!expr) return null;
      if (!this.expectPunctuation(")")) return null;
      return expr;
    }

    this.addError(`Unexpected token: ${tok.type}`, tok.line, tok.column, "error");
    this.advance();
    return null;
  }

  private parseArguments(): Expression[] {
    const args: Expression[] = [];

    while (!this.checkPunctuation(")") && !this.isAtEnd()) {
      const arg = this.parseExpression();
      if (arg) args.push(arg);
      if (!this.matchPunctuation(",")) break;
    }

    return args;
  }

  // Helper methods
  private parseBinary(
    nextPrecedence: () => Expression | null,
    operators: string[]
  ): Expression | null {
    let left = nextPrecedence();
    if (!left) return null;

    while (operators.includes(this.peek().value)) {
      const op = this.advance();
      const right = nextPrecedence();
      if (!right) return null;

      left = {
        type: "BinaryExpression",
        operator: op.value,
        left,
        right,
        loc: { start: left.loc.start, end: right.loc.end }
      };
    }

    return left;
  }

  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchPunctuation(value: string): boolean {
    if (this.checkPunctuation(value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType, value?: string): boolean {
    if (this.isAtEnd()) return false;
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value && tok.value !== value) return false;
    return true;
  }

  private checkPunctuation(value: string): boolean {
    return this.check("PUNCTUATION", value);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.position] ?? this.tokens[this.tokens.length - 1];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }

  private expect(type: TokenType, message: string): Token | null {
    if (this.check(type)) return this.advance();
    const tok = this.peek();
    this.addError(message, tok.line, tok.column, "error");
    return null;
  }

  private expectPunctuation(value: string): boolean {
    if (this.matchPunctuation(value)) return true;
    const tok = this.peek();
    this.addError(`Expected '${value}'`, tok.line, tok.column, "error");
    return false;
  }

  private skipCommentsAndWhitespace(): void {
    while (this.check("COMMENT") || this.check("WHITESPACE")) {
      this.advance();
    }
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().value === ";") return;
      
      switch (this.peek().value) {
        case "fn":
        case "let":
        case "if":
        case "while":
        case "return":
          return;
      }

      this.advance();
    }
  }

  private addError(message: string, line: number, column: number, severity: "error" | "warning") {
    this.errors.push({ message, line, column, severity });
  }

  private createLoc(startIdx: number, endIdx: number) {
    const start = this.tokens[startIdx] ?? this.tokens[0];
    const end = this.tokens[endIdx] ?? this.tokens[this.tokens.length - 1];
    return {
      start: { line: start.line, column: start.column, offset: start.start },
      end: { line: end.line, column: end.column, offset: end.end }
    };
  }
}

export function parse(tokens: Token[]): ParseResult<Program> {
  const parser = new Parser(tokens);
  return parser.parse();
}
