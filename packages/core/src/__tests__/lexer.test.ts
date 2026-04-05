import { describe, it, expect } from "vitest";
import { Lexer } from "../lexer";

describe("Lexer", () => {
  it("should tokenize a simple program", () => {
    const source = `fn main() {
      let x = 42;
    }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    expect(tokens).toBeDefined();
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("should handle comments", () => {
    const source = "// this is a comment\nlet x = 1;";
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    expect(tokens.some(t => t.type === "COMMENT")).toBe(true);
  });

  it("should tokenize strings", () => {
    const source = 'let greeting = "hello world";';
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    expect(tokens.some(t => t.type === "STRING" && t.value === '"hello world"')).toBe(true);
  });
});
