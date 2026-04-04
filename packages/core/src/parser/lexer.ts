import type { Token, TokenType, ParseError, ParseResult } from "../types/ast.js";

/**
 * Lexer with error recovery - tokenizes OBSIDIAN source code
 */
export class Lexer {
  private source: string;
  private position = 0;
  private line = 1;
  private column = 1;
  private errors: ParseError[] = [];

  // Keywords
  private static readonly KEYWORDS = new Set([
    "fn", "let", "if", "else", "while", "return", "true", "false",
    "i64", "f64", "bool", "string"
  ]);

  // Operators
  private static readonly OPERATORS = new Set([
    "+", "-", "*", "/", "%", "=", "==", "!=", "<", ">", "<=", ">=",
    "&&", "||", "!", "->"
  ]);

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): ParseResult<Token[]> {
    const tokens: Token[] = [];
    
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      
      if (this.isAtEnd()) break;

      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push(this.createToken("EOF", "", this.line, this.column, this.position, this.position));

    return {
      success: this.errors.length === 0,
      value: tokens,
      errors: this.errors
    };
  }

  private nextToken(): Token | null {
    const startLine = this.line;
    const startCol = this.column;
    const startPos = this.position;

    // Comments
    if (this.match("//")) {
      return this.readComment(startLine, startCol, startPos);
    }

    // Strings
    if (this.peek() === '"') {
      return this.readString(startLine, startCol, startPos);
    }

    // Numbers
    if (this.isDigit(this.peek())) {
      return this.readNumber(startLine, startCol, startPos);
    }

    // Identifiers and keywords
    if (this.isAlpha(this.peek()) || this.peek() === '_') {
      return this.readIdentifier(startLine, startCol, startPos);
    }

    // Operators
    const op = this.readOperator();
    if (op) {
      return this.createToken("OPERATOR", op, startLine, startCol, startPos, this.position);
    }

    // Punctuation
    const punct = this.readPunctuation();
    if (punct) {
      return this.createToken("PUNCTUATION", punct, startLine, startCol, startPos, this.position);
    }

    // Unknown character - error recovery
    this.addError(`Unexpected character: '${this.peek()}'`, startLine, startCol, "error");
    this.advance(); // Skip and continue
    return null;
  }

  private readComment(line: number, col: number, start: number): Token {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
    return this.createToken("COMMENT", this.source.slice(start, this.position), line, col, start, this.position);
  }

  private readString(line: number, col: number, start: number): Token | null {
    this.advance(); // Consume opening quote
    let value = "";
    
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.peek();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          default:
            this.addError(`Invalid escape sequence: \\${escaped}`, this.line, this.column, "error");
            value += escaped;
        }
        this.advance();
      } else {
        value += this.peek();
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      this.addError("Unterminated string literal", line, col, "error");
      return null;
    }

    this.advance(); // Consume closing quote
    return this.createToken("STRING", value, line, col, start, this.position);
  }

  private readNumber(line: number, col: number, start: number): Token {
    let value = "";
    let isFloat = false;

    while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '.')) {
      if (this.peek() === '.') {
        if (isFloat) break;
        isFloat = true;
      }
      value += this.peek();
      this.advance();
    }

    return this.createToken("NUMBER", value, line, col, start, this.position);
  }

  private readIdentifier(line: number, col: number, start: number): Token {
    let value = "";

    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      value += this.peek();
      this.advance();
    }

    const type = Lexer.KEYWORDS.has(value) ? "KEYWORD" : 
                 (value === "true" || value === "false") ? "BOOLEAN" : "IDENTIFIER";
    
    return this.createToken(type, value, line, col, start, this.position);
  }

  private readOperator(): string | null {
    // Try 2-char operators first
    const twoChar = this.source.slice(this.position, this.position + 2);
    if (Lexer.OPERATORS.has(twoChar)) {
      this.advance();
      this.advance();
      return twoChar;
    }

    // Then 1-char operators
    const oneChar = this.peek();
    if (Lexer.OPERATORS.has(oneChar)) {
      this.advance();
      return oneChar;
    }

    return null;
  }

  private readPunctuation(): string | null {
    const punct = this.peek();
    if ("(){}[],;:".includes(punct)) {
      this.advance();
      return punct;
    }
    return null;
  }

  private createToken(
    type: TokenType,
    value: string,
    line: number,
    column: number,
    start: number,
    end?: number
  ): Token {
    return {
      type,
      value,
      line,
      column,
      start,
      end: end ?? start + value.length
    };
  }

  private addError(message: string, line: number, column: number, severity: "error" | "warning") {
    this.errors.push({ message, line, column, severity });
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.source[this.position];
  }

  private advance(): void {
    if (!this.isAtEnd()) {
      if (this.source[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  private match(expected: string): boolean {
    if (this.source.slice(this.position, this.position + expected.length) === expected) {
      for (let i = 0; i < expected.length; i++) {
        this.advance();
      }
      return true;
    }
    return false;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /\s/.test(this.peek()) && this.peek() !== '\n') {
      this.advance();
    }
  }

  private isDigit(c: string): boolean {
    return /\d/.test(c);
  }

  private isAlpha(c: string): boolean {
    return /[a-zA-Z]/.test(c);
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }
}

export function tokenize(source: string): ParseResult<Token[]> {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
