import { Token, TokenKind } from "./lexer";

// ── AST Node Types ──────────────────────────────────────────────────────────

export interface ASTNode {
  type: string;
}

// ── Top-level items ─────────────────────────────────────────────────────────

export interface Module extends ASTNode {
  type: "Module";
  items: TopLevelItem[];
}

export type TopLevelItem = FnItem | StructDef | EnumDef;

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

export interface StructDef extends ASTNode {
  type: "StructDef";
  name: string;
  fields: StructField[];
}

export interface StructField {
  name: string;
  ty: string;
}

export interface EnumDef extends ASTNode {
  type: "EnumDef";
  name: string;
  variants: EnumVariant[];
}

export interface EnumVariant {
  name: string;
  fields: StructField[];
}

// ── Blocks and Statements ───────────────────────────────────────────────────

export interface Block extends ASTNode {
  type: "Block";
  stmts: Stmt[];
}

export type Stmt =
  | LetStmt
  | ExprStmt
  | ReturnStmt
  | WhileStmt
  | IfStmt
  | ForStmt;

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
  elseBlock: Block | IfStmt | null;
}

export interface ForStmt extends ASTNode {
  type: "For";
  varName: string;
  iter: Expr;
  body: Block;
}

// ── Expressions ─────────────────────────────────────────────────────────────

export type Expr =
  | IntExpr
  | FloatExpr
  | StrExpr
  | FStrExpr
  | BoolExpr
  | IdentExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr
  | BlockExpr
  | ArrayExpr
  | IndexExpr
  | RangeExpr
  | StructLitExpr
  | FieldAccessExpr
  | EnumLitExpr
  | MatchExpr
  | ClosureExpr
  | MethodCallExpr
  | IndexAssignExpr
  | FieldAssignExpr;

export interface IntExpr extends ASTNode { type: "Int"; value: number; }
export interface FloatExpr extends ASTNode { type: "Float"; value: number; }
export interface StrExpr extends ASTNode { type: "Str"; value: string; }
export interface FStrExpr extends ASTNode { type: "FStr"; parts: FStrPart[]; }
export type FStrPart = { kind: "lit"; value: string } | { kind: "expr"; expr: Expr };
export interface BoolExpr extends ASTNode { type: "Bool"; value: boolean; }
export interface IdentExpr extends ASTNode { type: "Ident"; name: string; }
export interface BinaryExpr extends ASTNode { type: "Binary"; op: string; left: Expr; right: Expr; }
export interface UnaryExpr extends ASTNode { type: "Unary"; op: string; expr: Expr; }
export interface CallExpr extends ASTNode { type: "Call"; callee: Expr; args: Expr[]; }
export interface BlockExpr extends ASTNode { type: "BlockExpr"; block: Block; }
export interface ArrayExpr extends ASTNode { type: "Array"; elements: Expr[]; }
export interface IndexExpr extends ASTNode { type: "Index"; object: Expr; index: Expr; }
export interface RangeExpr extends ASTNode { type: "Range"; start: Expr; end: Expr; }
export interface StructLitExpr extends ASTNode { type: "StructLit"; name: string; fields: { name: string; value: Expr }[]; }
export interface FieldAccessExpr extends ASTNode { type: "FieldAccess"; object: Expr; field: string; }
export interface EnumLitExpr extends ASTNode { type: "EnumLit"; enumName: string; variant: string; fields: { name: string; value: Expr }[]; }
export interface MatchExpr extends ASTNode { type: "Match"; subject: Expr; arms: MatchArm[]; }
export interface MatchArm { pattern: MatchPattern; body: Expr; }
export type MatchPattern =
  | { kind: "enum"; enumName: string; variant: string; bindings: string[] }
  | { kind: "wildcard" };
export interface ClosureExpr extends ASTNode { type: "Closure"; params: Param[]; retTy: string | null; body: Expr; }
export interface MethodCallExpr extends ASTNode { type: "MethodCall"; object: Expr; method: string; args: Expr[]; }
export interface IndexAssignExpr extends ASTNode { type: "IndexAssign"; object: Expr; index: Expr; value: Expr; }
export interface FieldAssignExpr extends ASTNode { type: "FieldAssign"; object: Expr; field: string; value: Expr; }

// ── Parser ──────────────────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private i: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.i = 0;
  }

  private peek(): Token {
    return this.tokens[this.i];
  }

  private peekNext(): Token {
    const idx = Math.min(this.i + 1, this.tokens.length - 1);
    return this.tokens[idx];
  }

  private bump(): Token {
    const t = this.tokens[this.i];
    this.i = Math.min(this.i + 1, this.tokens.length - 1);
    return t;
  }

  private atEnd(): boolean {
    return this.peek().kind === TokenKind.Eof;
  }

  private expect(kind: TokenKind, value?: string): Token {
    const t = this.peek();
    if (t.kind !== kind || (value !== undefined && t.value !== value)) {
      throw new Error(`Expected ${kind}${value ? ` '${value}'` : ""}, got ${t.kind} '${t.value}' at position ${t.pos}`);
    }
    return this.bump();
  }

  private eat(kind: TokenKind, value?: string): boolean {
    if (this.peek().kind === kind && (value === undefined || this.peek().value === value)) {
      this.bump();
      return true;
    }
    return false;
  }

  private check(kind: TokenKind, value?: string): boolean {
    const t = this.peek();
    return t.kind === kind && (value === undefined || t.value === value);
  }

  // ── Module ──────────────────────────────────────────────────────────────

  parseModule(): Module {
    const items: TopLevelItem[] = [];
    while (!this.atEnd()) {
      if (this.check(TokenKind.Keyword, "fn")) {
        items.push(this.parseFn());
      } else if (this.check(TokenKind.Keyword, "struct")) {
        items.push(this.parseStructDef());
      } else if (this.check(TokenKind.Keyword, "enum")) {
        items.push(this.parseEnumDef());
      } else {
        throw new Error(`Unexpected token '${this.peek().value}' at top level, position ${this.peek().pos}`);
      }
    }
    return { type: "Module", items };
  }

  // ── Top-level definitions ───────────────────────────────────────────────

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
          ty = this.parseTypeAnnotation();
        }
        params.push({ name: pName, ty });
      } while (this.eat(TokenKind.Punct, ","));
      this.expect(TokenKind.Punct, ")");
    }

    let retTy: string | null = null;
    if (this.eat(TokenKind.Op, "->")) {
      retTy = this.parseTypeAnnotation();
    }

    const body = this.parseBlock();
    return { type: "FnItem", name, params, retTy, body };
  }

  private parseTypeAnnotation(): string {
    // Support [T] array syntax
    if (this.eat(TokenKind.Punct, "[")) {
      const inner = this.parseTypeAnnotation();
      this.expect(TokenKind.Punct, "]");
      return `[${inner}]`;
    }
    const name = this.expect(TokenKind.Ident).value as string;
    return name;
  }

  private parseStructDef(): StructDef {
    this.expect(TokenKind.Keyword, "struct");
    const name = this.expect(TokenKind.Ident).value as string;
    this.expect(TokenKind.Punct, "{");
    const fields: StructField[] = [];
    while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
      const fieldName = this.expect(TokenKind.Ident).value as string;
      this.expect(TokenKind.Punct, ":");
      const fieldTy = this.parseTypeAnnotation();
      fields.push({ name: fieldName, ty: fieldTy });
      this.eat(TokenKind.Punct, ",");
    }
    this.expect(TokenKind.Punct, "}");
    return { type: "StructDef", name, fields };
  }

  private parseEnumDef(): EnumDef {
    this.expect(TokenKind.Keyword, "enum");
    const name = this.expect(TokenKind.Ident).value as string;
    this.expect(TokenKind.Punct, "{");
    const variants: EnumVariant[] = [];
    while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
      const variantName = this.expect(TokenKind.Ident).value as string;
      const fields: StructField[] = [];
      if (this.eat(TokenKind.Punct, "{")) {
        while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
          const fname = this.expect(TokenKind.Ident).value as string;
          this.expect(TokenKind.Punct, ":");
          const fty = this.parseTypeAnnotation();
          fields.push({ name: fname, ty: fty });
          this.eat(TokenKind.Punct, ",");
        }
        this.expect(TokenKind.Punct, "}");
      }
      this.eat(TokenKind.Punct, ",");
      variants.push({ name: variantName, fields });
    }
    this.expect(TokenKind.Punct, "}");
    return { type: "EnumDef", name, variants };
  }

  // ── Blocks and Statements ─────────────────────────────────────────────

  private parseBlock(): Block {
    this.expect(TokenKind.Punct, "{");
    const stmts: Stmt[] = [];
    while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
      stmts.push(this.parseStmt());
    }
    this.expect(TokenKind.Punct, "}");
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
    if (this.check(TokenKind.Keyword, "if")) {
      return this.parseIf();
    }
    if (this.check(TokenKind.Keyword, "for")) {
      return this.parseFor();
    }
    const expr = this.parseExpr(0);
    this.eat(TokenKind.Punct, ";");
    return { type: "ExprStmt", expr };
  }

  private parseLet(): LetStmt {
    const name = this.expect(TokenKind.Ident).value as string;
    let ty: string | null = null;
    if (this.eat(TokenKind.Punct, ":")) {
      ty = this.parseTypeAnnotation();
    }
    this.expect(TokenKind.Op, "=");
    const init = this.parseExpr(0);
    this.eat(TokenKind.Punct, ";");
    return { type: "Let", name, ty, init };
  }

  private parseReturn(): ReturnStmt {
    if (this.check(TokenKind.Punct, ";")) {
      this.bump();
      return { type: "Return", expr: null };
    }
    const expr = this.parseExpr(0);
    this.eat(TokenKind.Punct, ";");
    return { type: "Return", expr };
  }

  private parseWhile(): WhileStmt {
    const cond = this.parseExpr(0);
    const body = this.parseBlock();
    return { type: "While", cond, body };
  }

  private parseIf(): IfStmt {
    this.expect(TokenKind.Keyword, "if");
    const cond = this.parseExpr(0);
    const thenBlock = this.parseBlock();
    let elseBlock: Block | IfStmt | null = null;
    if (this.eat(TokenKind.Keyword, "else")) {
      if (this.check(TokenKind.Keyword, "if")) {
        elseBlock = this.parseIf();
      } else {
        elseBlock = this.parseBlock();
      }
    }
    return { type: "If", cond, thenBlock, elseBlock };
  }

  private parseFor(): ForStmt {
    this.expect(TokenKind.Keyword, "for");
    const varName = this.expect(TokenKind.Ident).value as string;
    this.expect(TokenKind.Keyword, "in");
    const iter = this.parseExpr(0);
    const body = this.parseBlock();
    return { type: "For", varName, iter, body };
  }

  // ── Expressions (Pratt parser) ────────────────────────────────────────

  private parseExpr(minBp: number): Expr {
    let lhs = this.parsePrefix();

    while (true) {
      // Postfix: indexing, field access, method calls
      if (this.check(TokenKind.Punct, "[")) {
        // Check for index assignment: obj[idx] = value
        // We need to look ahead past the index expression
        const saved = this.i;
        this.bump(); // eat [
        const index = this.parseExpr(0);
        this.expect(TokenKind.Punct, "]");
        if (this.eat(TokenKind.Op, "=")) {
          const value = this.parseExpr(0);
          lhs = { type: "IndexAssign", object: lhs, index, value };
        } else {
          lhs = { type: "Index", object: lhs, index };
        }
        continue;
      }

      if (this.check(TokenKind.Punct, ".")) {
        this.bump(); // eat .
        const field = this.expect(TokenKind.Ident).value as string;
        // Check for method call: obj.method(args)
        if (this.check(TokenKind.Punct, "(")) {
          this.bump(); // eat (
          const args: Expr[] = [];
          if (!this.eat(TokenKind.Punct, ")")) {
            do {
              args.push(this.parseExpr(0));
            } while (this.eat(TokenKind.Punct, ","));
            this.expect(TokenKind.Punct, ")");
          }
          lhs = { type: "MethodCall", object: lhs, method: field, args };
        } else if (this.eat(TokenKind.Op, "=")) {
          // Field assignment: obj.field = value
          const value = this.parseExpr(0);
          lhs = { type: "FieldAssign", object: lhs, field, value };
        } else {
          lhs = { type: "FieldAccess", object: lhs, field };
        }
        continue;
      }

      // Function call: expr(args)
      if (this.check(TokenKind.Punct, "(") && this.isCallable(lhs)) {
        this.bump(); // eat (
        const args: Expr[] = [];
        if (!this.eat(TokenKind.Punct, ")")) {
          do {
            args.push(this.parseExpr(0));
          } while (this.eat(TokenKind.Punct, ","));
          this.expect(TokenKind.Punct, ")");
        }
        lhs = { type: "Call", callee: lhs, args };
        continue;
      }

      // Infix operators
      const power = this.infixBindingPower();
      if (!power) break;
      const [op, lBp, rBp] = power;
      if (lBp < minBp) break;

      this.bump();

      // Range operator: produces a RangeExpr
      if (op === "..") {
        const rhs = this.parseExpr(rBp);
        lhs = { type: "Range", start: lhs, end: rhs };
        continue;
      }

      // Assignment to identifier
      if (op === "=") {
        const rhs = this.parseExpr(rBp);
        if (lhs.type === "Ident") {
          lhs = { type: "Binary", op: "=", left: lhs, right: rhs };
        } else {
          throw new Error("Invalid assignment target");
        }
        continue;
      }

      const rhs = this.parseExpr(rBp);
      lhs = { type: "Binary", op, left: lhs, right: rhs };
    }

    return lhs;
  }

  private isCallable(expr: Expr): boolean {
    return expr.type === "Ident" || expr.type === "FieldAccess" || expr.type === "Closure";
  }

  private parsePrefix(): Expr {
    const tok = this.peek();

    // Closure: |params| body
    if (tok.kind === TokenKind.Op && tok.value === "|") {
      return this.parseClosure();
    }

    this.bump();

    switch (tok.kind) {
      case TokenKind.Int:
        return { type: "Int", value: tok.value as number };
      case TokenKind.Float:
        return { type: "Float", value: tok.value as number };
      case TokenKind.Str:
        return { type: "Str", value: tok.value as string };
      case TokenKind.FStr:
        return this.parseFString(tok.value as string);
      case TokenKind.Keyword:
        if (tok.value === "true") return { type: "Bool", value: true };
        if (tok.value === "false") return { type: "Bool", value: false };
        if (tok.value === "match") return this.parseMatch();
        throw new Error(`Unexpected keyword '${tok.value}' in expression at position ${tok.pos}`);
      case TokenKind.Ident: {
        const name = tok.value as string;

        // Check for Enum::Variant { fields } or Struct { fields }
        if (this.check(TokenKind.Punct, "::")) {
          this.bump(); // eat ::
          const variant = this.expect(TokenKind.Ident).value as string;
          // Enum variant construction
          const fields: { name: string; value: Expr }[] = [];
          if (this.eat(TokenKind.Punct, "{")) {
            while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
              const fname = this.expect(TokenKind.Ident).value as string;
              // Check for shorthand (just name) or name: value
              if (this.eat(TokenKind.Punct, ":")) {
                const fval = this.parseExpr(0);
                fields.push({ name: fname, value: fval });
              } else {
                // Shorthand: field name binds to same-name variable
                fields.push({ name: fname, value: { type: "Ident", name: fname } });
              }
              this.eat(TokenKind.Punct, ",");
            }
            this.expect(TokenKind.Punct, "}");
          }
          return { type: "EnumLit", enumName: name, variant, fields };
        }

        // Check for struct literal: Name { field: value, ... }
        // Only if followed by { and then ident : (to distinguish from block expr)
        if (this.check(TokenKind.Punct, "{") && this.isStructLiteral(name)) {
          return this.parseStructLiteral(name);
        }

        return { type: "Ident", name };
      }
      case TokenKind.Op:
        if (tok.value === "-" || tok.value === "!") {
          const expr = this.parseExpr(100); // high binding power for unary
          return { type: "Unary", op: tok.value, expr };
        }
        if (tok.value === "[") {
          // Array literal
          const elements: Expr[] = [];
          if (!this.eat(TokenKind.Punct, "]")) {
            do {
              elements.push(this.parseExpr(0));
            } while (this.eat(TokenKind.Punct, ","));
            this.expect(TokenKind.Punct, "]");
          }
          return { type: "Array", elements };
        }
        throw new Error(`Unexpected operator '${tok.value}' at ${tok.pos}`);
      case TokenKind.Punct:
        if (tok.value === "(") {
          const expr = this.parseExpr(0);
          this.expect(TokenKind.Punct, ")");
          return expr;
        }
        if (tok.value === "{") {
          // Block expression
          const block = this.parseBlock();
          return { type: "BlockExpr", block };
        }
        throw new Error(`Unexpected punctuation '${tok.value}' at ${tok.pos}`);
      default:
        throw new Error(`Unexpected token '${tok.value}' at ${tok.pos}`);
    }
  }

  private isStructLiteral(name: string): boolean {
    // Look ahead: if we see { ident : then it's a struct literal
    // If we see { followed by a statement, it's a block expression
    if (!this.check(TokenKind.Punct, "{")) return false;

    const saved = this.i;
    this.bump(); // eat {

    // Empty braces = struct literal with no fields
    if (this.check(TokenKind.Punct, "}")) {
      this.i = saved;
      return true;
    }

    // If first token is ident and second is :, it's a struct literal
    if (this.check(TokenKind.Ident)) {
      const next = this.peekNext();
      if (next.kind === TokenKind.Punct && next.value === ":") {
        this.i = saved;
        return true;
      }
    }

    this.i = saved;
    return false;
  }

  private parseStructLiteral(name: string): StructLitExpr {
    this.expect(TokenKind.Punct, "{");
    const fields: { name: string; value: Expr }[] = [];
    while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
      const fname = this.expect(TokenKind.Ident).value as string;
      this.expect(TokenKind.Punct, ":");
      const fval = this.parseExpr(0);
      fields.push({ name: fname, value: fval });
      this.eat(TokenKind.Punct, ",");
    }
    this.expect(TokenKind.Punct, "}");
    return { type: "StructLit", name, fields };
  }

  private parseClosure(): ClosureExpr {
    this.expect(TokenKind.Op, "|");
    const params: Param[] = [];
    if (!this.eat(TokenKind.Op, "|")) {
      do {
        const pName = this.expect(TokenKind.Ident).value as string;
        let ty: string | null = null;
        if (this.eat(TokenKind.Punct, ":")) {
          ty = this.parseTypeAnnotation();
        }
        params.push({ name: pName, ty });
      } while (this.eat(TokenKind.Punct, ","));
      this.expect(TokenKind.Op, "|");
    }

    let retTy: string | null = null;
    if (this.eat(TokenKind.Op, "->")) {
      retTy = this.parseTypeAnnotation();
    }

    let body: Expr;
    if (this.check(TokenKind.Punct, "{")) {
      const block = this.parseBlock();
      body = { type: "BlockExpr", block };
    } else {
      body = this.parseExpr(0);
    }

    return { type: "Closure", params, retTy, body };
  }

  private parseMatch(): MatchExpr {
    const subject = this.parseExpr(0);
    this.expect(TokenKind.Punct, "{");
    const arms: MatchArm[] = [];
    while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
      const pattern = this.parseMatchPattern();
      this.expect(TokenKind.Op, "=>");
      const body = this.parseExpr(0);
      this.eat(TokenKind.Punct, ",");
      arms.push({ pattern, body });
    }
    this.expect(TokenKind.Punct, "}");
    return { type: "Match", subject, arms };
  }

  private parseMatchPattern(): MatchPattern {
    // Wildcard pattern
    if (this.check(TokenKind.Ident) && this.peek().value === "_") {
      this.bump();
      return { kind: "wildcard" };
    }

    // Enum pattern: EnumName::Variant { bindings }
    const enumName = this.expect(TokenKind.Ident).value as string;
    this.expect(TokenKind.Punct, "::");
    const variant = this.expect(TokenKind.Ident).value as string;
    const bindings: string[] = [];
    if (this.eat(TokenKind.Punct, "{")) {
      while (!this.check(TokenKind.Punct, "}") && !this.atEnd()) {
        bindings.push(this.expect(TokenKind.Ident).value as string);
        this.eat(TokenKind.Punct, ",");
      }
      this.expect(TokenKind.Punct, "}");
    }
    return { kind: "enum", enumName, variant, bindings };
  }

  private parseFString(raw: string): FStrExpr {
    const parts: FStrPart[] = [];
    let i = 0;
    let current = "";

    while (i < raw.length) {
      if (raw[i] === "{" && i + 1 < raw.length && raw[i + 1] !== "{") {
        if (current) {
          parts.push({ kind: "lit", value: current });
          current = "";
        }
        i++; // skip {
        let exprStr = "";
        let depth = 1;
        while (i < raw.length && depth > 0) {
          if (raw[i] === "{") depth++;
          else if (raw[i] === "}") {
            depth--;
            if (depth === 0) break;
          }
          exprStr += raw[i];
          i++;
        }
        i++; // skip }
        // Parse the expression inside the interpolation
        const { lex } = require("./lexer");
        const innerTokens = lex(exprStr);
        const innerParser = new Parser(innerTokens);
        const expr = innerParser.parseExpr(0);
        parts.push({ kind: "expr", expr });
      } else {
        current += raw[i];
        i++;
      }
    }
    if (current) {
      parts.push({ kind: "lit", value: current });
    }
    return { type: "FStr", parts };
  }

  private infixBindingPower(): [string, number, number] | null {
    const tok = this.peek();
    if (tok.kind !== TokenKind.Op) return null;

    switch (tok.value) {
      case "..": return ["..", 9, 10];
      case "+": return ["+", 10, 11];
      case "-": return ["-", 10, 11];
      case "*": return ["*", 12, 13];
      case "/": return ["/", 12, 13];
      case "%": return ["%", 12, 13];
      case "==": return ["==", 6, 7];
      case "!=": return ["!=", 6, 7];
      case "<": return ["<", 8, 9];
      case "<=": return ["<=", 8, 9];
      case ">": return [">", 8, 9];
      case ">=": return [">=", 8, 9];
      case "&&": return ["&&", 4, 5];
      case "||": return ["||", 3, 4];
      case "=": return ["=", 1, 2];
      default: return null;
    }
  }
}

export function parse(tokens: Token[]): Module {
  const parser = new Parser(tokens);
  return parser.parseModule();
}
