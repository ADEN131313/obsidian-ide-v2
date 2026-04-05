import { describe, it, expect } from "vitest";
import { Lexer } from "../lexer";
import { Parser } from "../parser";

describe("Parser", () => {
  it("should parse a function declaration", () => {
    const source = `fn add(a: i64, b: i64) -> i64 {
      return a + b;
    }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    expect(ast).toBeDefined();
    expect(ast.body).toBeDefined();
    expect(ast.body.length).toBeGreaterThan(0);
  });

  it("should parse variable declarations", () => {
    const source = "let x = 42;";
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("VariableDeclaration");
  });
});
