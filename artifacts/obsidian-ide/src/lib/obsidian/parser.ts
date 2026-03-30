import { Token, TokenKind } from "./lexer";

export interface ASTNode {
  type: string;
}

export interface Module extends ASTNode {
  type: "Module";
  items: FnItem[];
}

export interface FnItem extends ASTNode {
  type: "FnItem";
  name: string;
  params: Param[];
  retTy: string | null;
  body: Block;
}

export interface Param {
  name: string;
  ty: string | null;
}

export interface Block extends ASTNode {
  type: "Block";
  stmts: Stmt[];
}

export type Stmt =
  | LetStmt
  | ExprStmt
  | ReturnStmt
  | WhileStmt
  | IfStmt;

export interface LetStmt extends ASTNode {
  type: "Let";
  name: string;
  ty: string | null;
  init: Expr;
}

export interface ExprStmt extends ASTNode {
  type: "ExprStmt";
  expr: Expr;
}

export interface ReturnStmt extends ASTNode {
  type: "Return";
  expr: Expr | null;
}

export interface WhileStmt extends ASTNode {
  type: "While";
  cond: Expr;
  body: Block;
}

export interface IfStmt extends ASTNode {
  type: "If";
  cond: Expr;
  thenBlock: Block;
  elseBlock: Block | null;
}

export type Expr =
  | IntExpr
  | StrExpr
  | BoolExpr
  | IdentExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | BlockExpr;

export interface IntExpr extends ASTNode { type: "Int"; value: number; }
export interface StrExpr extends ASTNode { type: "Str"; value: string; }
export interface BoolExpr extends ASTNode { type: "Bool"; value: boolean; }
export interface IdentExpr extends ASTNode { type: "Ident"; name: string; }
export interface BinaryExpr extends ASTNode { type: "Binary"; op: string; left: Expr; right: Expr; }
export interface UnaryExpr extends ASTNode { type: "Unary"; op: string; expr: Expr; }
export interface CallExpr extends ASTNode { type: "Call"; callee: string; args: Expr[]; }
export interface BlockExpr extends ASTNode { type: "BlockExpr"; block: Block; }

class Parser {
  private tokens: Token[];
  private i: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.i = 0;
  }

  private atEnd(): boolean {
    return this.peek().kind === TokenKind.Eof;
  }

  private peek(): Token {
    return this.tokens[this.i];
  }

  private bump(): Token {
    const t = this.tokens[this.i];
    this.i = Math.min(this.i + 1, this.tokens.length - 1);
    return t;
  }

  private expect(kind: TokenKind, value?: string): Token {
    const t = this.peek();
    if (t.kind !== kind || (value !== undefined && t.value !== value)) {
      throw new Error(`Expected ${value ?? kind} but got '${t.value}' at position ${t.pos}`);
    }
    return this.bump();
  }

  private eat(kind: TokenKind, value?: string): Token | null {
    const t = this.peek();
    if (t.kind === kind && (value === undefined || t.value === value)) {
      return this.bump();
    }
    return null;
  }

  parseModule(): Module {
    const items: FnItem[] = [];
    while (!this.atEnd()) {
      items.push(this.parseFn());
    }
    return { type: "Module", items };
  }

  private parseFn(): FnItem {
    this.expect(TokenKind.Keyword, "fn");
    const nameToken = this.expect(TokenKind.Ident);
    const name = nameToken.value as string;
    this.expect(TokenKind.Punct, "(");

    const params: Param[] = [];
    if (!this.eat(TokenKind.Punct, ")")) {
      do {
        const pName = this.expect(TokenKind.Ident).value as string;
        let ty: string | null = null;
        if (this.eat(TokenKind.Punct, ":")) {
          ty = this.expect(TokenKind.Ident).value as string;
        }
        params.push({ name: pName, ty });
      } while (this.eat(TokenKind.Punct, ","));
      this.expect(TokenKind.Punct, ")");
    }

    let retTy: string | null = null;
    if (this.eat(TokenKind.Op, "->")) {
      retTy = this.expect(TokenKind.Ident).value as string;
    }

    const body = this.parseBlock();
    return { type: "FnItem", name, params, retTy, body };
  }

  private parseBlock(): Block {
    this.expect(TokenKind.Punct, "{");
    const stmts: Stmt[] = [];
    while (!this.eat(TokenKind.Punct, "}") && !this.atEnd()) {
      stmts.push(this.parseStmt());
    }
    return { type: "Block", stmts };
  }

  private parseStmt(): Stmt {
    if (this.eat(TokenKind.Keyword, "let")) {
      return this.parseLet();
    }
    if (this.eat(TokenKind.Keyword, "return")) {
      return this.parseReturn();
    }
    if (this.eat(TokenKind.Keyword, "while")) {
      return this.parseWhile();
    }
    if (this.eat(TokenKind.Keyword, "if")) {
      return this.parseIf();
    }
    const expr = this.parseExpr(0);
    this.expect(TokenKind.Punct, ";");
    return { type: "ExprStmt", expr };
  }

  private parseLet(): LetStmt {
    const name = this.expect(TokenKind.Ident).value as string;
    let ty: string | null = null;
    if (this.eat(TokenKind.Punct, ":")) {
      ty = this.expect(TokenKind.Ident).value as string;
    }
    this.expect(TokenKind.Op, "=");
    const init = this.parseExpr(0);
    this.expect(TokenKind.Punct, ";");
    return { type: "Let", name, ty, init };
  }

  private parseReturn(): ReturnStmt {
    if (this.eat(TokenKind.Punct, ";")) {
      return { type: "Return", expr: null };
    }
    const expr = this.parseExpr(0);
    this.expect(TokenKind.Punct, ";");
    return { type: "Return", expr };
  }

  private parseWhile(): WhileStmt {
    const cond = this.parseExpr(0);
    const body = this.parseBlock();
    return { type: "While", cond, body };
  }

  private parseIf(): IfStmt {
    const cond = this.parseExpr(0);
    const thenBlock = this.parseBlock();
    let elseBlock: Block | null = null;
    if (this.eat(TokenKind.Keyword, "else")) {
      elseBlock = this.parseBlock();
    }
    return { type: "If", cond, thenBlock, elseBlock };
  }

  private parseExpr(minBp: number): Expr {
    let lhs = this.parsePrefix();

    while (true) {
      const power = this.infixBindingPower();
      if (!power) break;
      const [op, lBp, rBp] = power;
      if (lBp < minBp) break;

      this.bump();
      const rhs = this.parseExpr(rBp);
      lhs = { type: "Binary", op, left: lhs, right: rhs };
    }

    return lhs;
  }

  private parsePrefix(): Expr {
    const tok = this.bump();

    switch (tok.kind) {
      case TokenKind.Int:
        return { type: "Int", value: tok.value as number };
      case TokenKind.Str:
        return { type: "Str", value: tok.value as string };
      case TokenKind.Keyword:
        if (tok.value === "true") return { type: "Bool", value: true };
        if (tok.value === "false") return { type: "Bool", value: false };
        throw new Error(`Unexpected keyword '${tok.value}' in expression at position ${tok.pos}`);
      case TokenKind.Ident: {
        const name = tok.value as string;
        if (this.eat(TokenKind.Punct, "(")) {
          const args: Expr[] = [];
          if (!this.eat(TokenKind.Punct, ")")) {
            do {
              args.push(this.parseExpr(0));
            } while (this.eat(TokenKind.Punct, ","));
            this.expect(TokenKind.Punct, ")");
          }
          return { type: "Call", callee: name, args };
        }
        return { type: "Ident", name };
      }
      case TokenKind.Op:
        if (tok.value === "-") {
          const rhs = this.parseExpr(100);
          return { type: "Unary", op: "neg", expr: rhs };
        }
        if (tok.value === "!") {
          const rhs = this.parseExpr(100);
          return { type: "Unary", op: "not", expr: rhs };
        }
        throw new Error(`Unexpected operator '${tok.value}' in prefix position at ${tok.pos}`);
      case TokenKind.Punct:
        if (tok.value === "(") {
          const e = this.parseExpr(0);
          this.expect(TokenKind.Punct, ")");
          return e;
        }
        if (tok.value === "{") {
          this.i--;
          const block = this.parseBlock();
          return { type: "BlockExpr", block };
        }
        throw new Error(`Unexpected punctuation '${tok.value}' at ${tok.pos}`);
      default:
        throw new Error(`Unexpected token '${tok.value}' at ${tok.pos}`);
    }
  }

  private infixBindingPower(): [string, number, number] | null {
    const tok = this.peek();
    if (tok.kind !== TokenKind.Op) return null;
    switch (tok.value) {
      case "=": return ["=", 1, 0];
      case "||": return ["||", 2, 3];
      case "&&": return ["&&", 4, 5];
      case "==": return ["==", 6, 7];
      case "!=": return ["!=", 6, 7];
      case "<": return ["<", 8, 9];
      case "<=": return ["<=", 8, 9];
      case ">": return [">", 8, 9];
      case ">=": return [">=", 8, 9];
      case "+": return ["+", 10, 11];
      case "-": return ["-", 10, 11];
      case "*": return ["*", 12, 13];
      case "/": return ["/", 12, 13];
      case "%": return ["%", 12, 13];
      default: return null;
    }
  }
}

export function parse(tokens: Token[]): Module {
  const parser = new Parser(tokens);
  return parser.parseModule();
}
