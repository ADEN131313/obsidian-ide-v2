/**
 * Enhanced OBSIDIAN Parser with error recovery and better diagnostics
 */

export type TokenType =
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "KEYWORD"
  | "OPERATOR"
  | "PUNCTUATION"
  | "COMMENT"
  | "WHITESPACE"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  expected?: string[];
  received?: string;
}

export interface ParseResult<T> {
  success: boolean;
  value?: T;
  errors: ParseError[];
}

// AST Node Types
export interface ASTNode {
  type: string;
  loc: SourceLocation;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  column: number;
  offset: number;
}

// Expression types
export type Expression =
  | BinaryExpression
  | UnaryExpression
  | LiteralExpression
  | IdentifierExpression
  | CallExpression
  | AssignmentExpression
  | BlockExpression;

export interface BinaryExpression extends ASTNode {
  type: "BinaryExpression";
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends ASTNode {
  type: "UnaryExpression";
  operator: string;
  operand: Expression;
}

export interface LiteralExpression extends ASTNode {
  type: "Literal";
  value: string | number | boolean;
  raw: string;
}

export interface IdentifierExpression extends ASTNode {
  type: "Identifier";
  name: string;
}

export interface CallExpression extends ASTNode {
  type: "CallExpression";
  callee: IdentifierExpression;
  arguments: Expression[];
}

export interface AssignmentExpression extends ASTNode {
  type: "AssignmentExpression";
  operator: string;
  left: IdentifierExpression;
  right: Expression;
}

export interface BlockExpression extends ASTNode {
  type: "BlockExpression";
  statements: Statement[];
  returnValue?: Expression;
}

// Statement types
export type Statement =
  | VariableDeclaration
  | FunctionDeclaration
  | IfStatement
  | WhileStatement
  | ReturnStatement
  | ExpressionStatement;

export interface VariableDeclaration extends ASTNode {
  type: "VariableDeclaration";
  name: string;
  valueType?: string;
  initializer: Expression;
  mutable: boolean;
}

export interface FunctionDeclaration extends ASTNode {
  type: "FunctionDeclaration";
  name: string;
  parameters: Parameter[];
  returnType?: string;
  body: BlockExpression;
}

export interface Parameter {
  name: string;
  type?: string;
  loc: SourceLocation;
}

export interface IfStatement extends ASTNode {
  type: "IfStatement";
  condition: Expression;
  consequent: BlockExpression;
  alternate?: BlockExpression | IfStatement;
}

export interface WhileStatement extends ASTNode {
  type: "WhileStatement";
  condition: Expression;
  body: BlockExpression;
}

export interface ReturnStatement extends ASTNode {
  type: "ReturnStatement";
  argument?: Expression;
}

export interface ExpressionStatement extends ASTNode {
  type: "ExpressionStatement";
  expression: Expression;
}

// Program
export interface Program extends ASTNode {
  type: "Program";
  body: Statement[];
}
