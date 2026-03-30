import { Module, FnItem, Block, Stmt, Expr } from "./parser";

export type ObsidianValue = number | string | boolean | null | undefined;

class ReturnSignal {
  value: ObsidianValue;
  constructor(value: ObsidianValue) {
    this.value = value;
  }
}

class Environment {
  private vars: Map<string, ObsidianValue>;
  private parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  get(name: string): ObsidianValue {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable: ${name}`);
  }

  set(name: string, value: ObsidianValue): void {
    if (this.vars.has(name)) {
      this.vars.set(name, value);
      return;
    }
    if (this.parent) {
      try {
        this.parent.get(name);
        this.parent.set(name, value);
        return;
      } catch { /* not found in parent */ }
    }
    this.vars.set(name, value);
  }

  define(name: string, value: ObsidianValue): void {
    this.vars.set(name, value);
  }
}

const MAX_STEPS = 100000;

export class Interpreter {
  private functions: Map<string, FnItem>;
  private output: string[];
  private steps: number;

  constructor() {
    this.functions = new Map();
    this.output = [];
    this.steps = 0;
  }

  getOutput(): string[] {
    return this.output;
  }

  run(module: Module): string[] {
    this.output = [];
    this.functions = new Map();
    this.steps = 0;

    for (const item of module.items) {
      this.functions.set(item.name, item);
    }

    const main = this.functions.get("main");
    if (main) {
      const env = new Environment();
      this.execBlock(main.body, env);
    } else if (module.items.length > 0) {
      const last = module.items[module.items.length - 1];
      const env = new Environment();
      this.execBlock(last.body, env);
    }

    return this.output;
  }

  private tick(): void {
    this.steps++;
    if (this.steps > MAX_STEPS) {
      throw new Error("Execution limit exceeded (infinite loop?)");
    }
  }

  private execBlock(block: Block, env: Environment): ObsidianValue {
    let last: ObsidianValue = null;
    for (const stmt of block.stmts) {
      last = this.execStmt(stmt, env);
      if (last instanceof ReturnSignal) return last;
    }
    return last;
  }

  private execStmt(stmt: Stmt, env: Environment): ObsidianValue {
    this.tick();
    switch (stmt.type) {
      case "Let": {
        const val = this.evalExpr(stmt.init, env);
        env.define(stmt.name, val);
        return null;
      }
      case "ExprStmt":
        return this.evalExpr(stmt.expr, env);
      case "Return": {
        const val = stmt.expr ? this.evalExpr(stmt.expr, env) : null;
        return new ReturnSignal(val);
      }
      case "While": {
        while (this.isTruthy(this.evalExpr(stmt.cond, env))) {
          this.tick();
          const result = this.execBlock(stmt.body, new Environment(env));
          if (result instanceof ReturnSignal) return result;
        }
        return null;
      }
      case "If": {
        const cond = this.evalExpr(stmt.cond, env);
        if (this.isTruthy(cond)) {
          return this.execBlock(stmt.thenBlock, new Environment(env));
        } else if (stmt.elseBlock) {
          return this.execBlock(stmt.elseBlock, new Environment(env));
        }
        return null;
      }
    }
  }

  private evalExpr(expr: Expr, env: Environment): ObsidianValue {
    this.tick();
    switch (expr.type) {
      case "Int":
        return expr.value;
      case "Str":
        return expr.value;
      case "Bool":
        return expr.value;
      case "Ident":
        return env.get(expr.name);
      case "Unary":
        return this.evalUnary(expr.op, this.evalExpr(expr.expr, env));
      case "Binary":
        return this.evalBinary(expr.op, expr.left, expr.right, env);
      case "Call":
        return this.evalCall(expr.callee, expr.args, env);
      case "BlockExpr": {
        const childEnv = new Environment(env);
        const result = this.execBlock(expr.block, childEnv);
        if (result instanceof ReturnSignal) return result.value;
        return result;
      }
    }
  }

  private evalUnary(op: string, val: ObsidianValue): ObsidianValue {
    if (op === "neg") {
      if (typeof val === "number") return -val;
      throw new Error(`Cannot negate ${typeof val}`);
    }
    if (op === "not") {
      return !this.isTruthy(val);
    }
    throw new Error(`Unknown unary operator: ${op}`);
  }

  private evalBinary(op: string, leftExpr: Expr, rightExpr: Expr, env: Environment): ObsidianValue {
    if (op === "=") {
      const val = this.evalExpr(rightExpr, env);
      if (leftExpr.type === "Ident") {
        env.set(leftExpr.name, val);
        return val;
      }
      throw new Error("Invalid assignment target");
    }

    if (op === "&&") {
      const l = this.evalExpr(leftExpr, env);
      if (!this.isTruthy(l)) return l;
      return this.evalExpr(rightExpr, env);
    }
    if (op === "||") {
      const l = this.evalExpr(leftExpr, env);
      if (this.isTruthy(l)) return l;
      return this.evalExpr(rightExpr, env);
    }

    const left = this.evalExpr(leftExpr, env);
    const right = this.evalExpr(rightExpr, env);

    if (typeof left === "number" && typeof right === "number") {
      switch (op) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/":
          if (right === 0) throw new Error("Division by zero");
          return left / right;
        case "%":
          if (right === 0) throw new Error("Modulo by zero");
          return left % right;
        case "==": return left === right;
        case "!=": return left !== right;
        case "<": return left < right;
        case "<=": return left <= right;
        case ">": return left > right;
        case ">=": return left >= right;
      }
    }

    if (typeof left === "string" && typeof right === "string") {
      if (op === "+") return left + right;
      if (op === "==") return left === right;
      if (op === "!=") return left !== right;
    }

    if (typeof left === "string" && typeof right === "number" && op === "+") {
      return left + String(right);
    }
    if (typeof left === "number" && typeof right === "string" && op === "+") {
      return String(left) + right;
    }

    if (op === "==" || op === "!=") {
      return op === "==" ? left === right : left !== right;
    }

    throw new Error(`Cannot apply '${op}' to ${typeof left} and ${typeof right}`);
  }

  private evalCall(callee: string, argExprs: Expr[], env: Environment): ObsidianValue {
    const args = argExprs.map((a) => this.evalExpr(a, env));

    switch (callee) {
      case "print": {
        const str = args.map((a) => (a === null || a === undefined ? "null" : String(a))).join(" ");
        this.output.push(str);
        return null;
      }
      case "sqrt": {
        if (typeof args[0] !== "number") throw new Error("sqrt expects a number");
        return Math.sqrt(args[0]);
      }
      case "abs": {
        if (typeof args[0] !== "number") throw new Error("abs expects a number");
        return Math.abs(args[0]);
      }
      case "len": {
        if (typeof args[0] !== "string") throw new Error("len expects a string");
        return args[0].length;
      }
      case "to_string": {
        return args[0] === null || args[0] === undefined ? "null" : String(args[0]);
      }
      case "floor": {
        if (typeof args[0] !== "number") throw new Error("floor expects a number");
        return Math.floor(args[0]);
      }
      case "ceil": {
        if (typeof args[0] !== "number") throw new Error("ceil expects a number");
        return Math.ceil(args[0]);
      }
      case "round": {
        if (typeof args[0] !== "number") throw new Error("round expects a number");
        return Math.round(args[0]);
      }
      case "max": {
        if (typeof args[0] !== "number" || typeof args[1] !== "number") throw new Error("max expects numbers");
        return Math.max(args[0], args[1]);
      }
      case "min": {
        if (typeof args[0] !== "number" || typeof args[1] !== "number") throw new Error("min expects numbers");
        return Math.min(args[0], args[1]);
      }
      case "pow": {
        if (typeof args[0] !== "number" || typeof args[1] !== "number") throw new Error("pow expects numbers");
        return Math.pow(args[0], args[1]);
      }
    }

    const fn = this.functions.get(callee);
    if (!fn) throw new Error(`Undefined function: ${callee}`);

    if (args.length !== fn.params.length) {
      throw new Error(`${callee} expects ${fn.params.length} arguments, got ${args.length}`);
    }

    const fnEnv = new Environment();
    for (let j = 0; j < fn.params.length; j++) {
      fnEnv.define(fn.params[j].name, args[j]);
    }

    const result = this.execBlock(fn.body, fnEnv);
    if (result instanceof ReturnSignal) return result.value;
    return result;
  }

  private isTruthy(val: ObsidianValue): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (typeof val === "string") return val.length > 0;
    return true;
  }
}

export function runObsidian(source: string): { output: string[]; error: string | null } {
  try {
    const { lex } = require("./lexer");
    const { parse } = require("./parser");
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
