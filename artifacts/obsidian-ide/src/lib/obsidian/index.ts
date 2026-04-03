import { lex } from "./lexer";
import { parse } from "./parser";
import { Interpreter } from "./interpreter";

export { lex } from "./lexer";
export { parse } from "./parser";
export { Interpreter } from "./interpreter";
export type { Token, TokenKind } from "./lexer";
export type { Module, FnItem, Stmt, Expr, TopLevelItem } from "./parser";

export function runObsidian(source: string): {
  output: string[];
  error: string | null;
} {
  try {
    const tokens = lex(source);
    const ast = parse(tokens);
    const interp = new Interpreter();
    const output = interp.run(ast);
    return { output, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { output: [], error: msg };
  }
}
