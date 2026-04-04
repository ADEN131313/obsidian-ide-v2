import {
  Module, FnItem, Block, Stmt, Expr, TopLevelItem,
  StructDef, EnumDef, MatchPattern, FStrPart, Param,
} from "./parser";

// ── Value Types ─────────────────────────────────────────────────────────────

export type ObsidianValue =
  | number
  | string
  | boolean
  | null
  | undefined
  | ObsidianValue[]
  | ObsidianStruct
  | ObsidianEnum
  | ObsidianClosure;

export interface ObsidianStruct {
  __kind: "struct";
  __name: string;
  [key: string]: ObsidianValue | string;
}

export interface ObsidianEnum {
  __kind: "enum";
  __enumName: string;
  __variant: string;
  [key: string]: ObsidianValue | string;
}

export interface ObsidianClosure {
  __kind: "closure";
  params: Param[];
  body: Expr;
  env: Environment;
}

// ── Control Flow Signals ────────────────────────────────────────────────────

class ReturnSignal {
  value: ObsidianValue;
  constructor(value: ObsidianValue) {
    this.value = value;
  }
}

class BreakSignal {}

// ── Environment ─────────────────────────────────────────────────────────────

class Environment {
  private vars: Map<string, ObsidianValue>;
  private parent: Environment | null;

  constructor(parent?: Environment) {
    this.vars = new Map();
    this.parent = parent || null;
  }

  define(name: string, value: ObsidianValue): void {
    this.vars.set(name, value);
  }

  get(name: string): ObsidianValue {
    if (this.vars.has(name)) return this.vars.get(name)!;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable: ${name}`);
  }
}

// ── Interpreter ─────────────────────────────────────────────────────────────

const MAX_STEPS = 100000;

export class Interpreter {
  private functions: Map<string, FnItem>;
  private structs: Map<string, StructDef>;
  private enums: Map<string, EnumDef>;
  private output: string[];
  private steps: number;

  constructor() {
    this.functions = new Map();
    this.structs = new Map();
    this.enums = new Map();
    this.output = [];
    this.steps = 0;
  }

  private tick(): void {
    this.steps++;
    if (this.steps > MAX_STEPS) {
      throw new Error("Execution timeout");
    }
  }

  run(module: Module): string[] {
    this.output = [];
    this.functions = new Map();
    this.structs = new Map();
    this.enums = new Map();
    this.steps = 0;

    // Register all top-level items
    for (const item of module.items) {
      switch (item.type) {
        case "FnItem":
          this.functions.set(item.name, item);
          break;
        case "StructDef":
          this.structs.set(item.name, item);
          break;
        case "EnumDef":
          this.enums.set(item.name, item);
          break;
      }
    }

    // Find and run main, or the last function
    const main = this.functions.get("main");
    if (main) {
      const env = new Environment();
      this.execBlock(main.body, env);
    } else {
      // Find the last FnItem
      const fnItems = module.items.filter((i): i is FnItem => i.type === "FnItem");
      if (fnItems.length > 0) {
        const last = fnItems[fnItems.length - 1];
        const env = new Environment();
        this.execBlock(last.body, env);
      }
    }

    return this.output;
  }

  // ── Block and Statement Execution ───────────────────────────────────────

  private execBlock(block: Block, env: Environment): ObsidianValue {
    let last: ObsidianValue = null;
    for (const stmt of block.stmts) {
      last = this.execStmt(stmt, env);
      if (last instanceof ReturnSignal) return last;
      if (last instanceof BreakSignal) return last as unknown as ObsidianValue;
    }
    return last;
  }

  private execStmt(stmt: Stmt, env: Environment): ObsidianValue {
    switch (stmt.type) {
      case "Let": {
        const val = this.evalExpr(stmt.init, env);
        env.define(stmt.name, val);
        return val;
      }
      case "ExprStmt": {
        return this.evalExpr(stmt.expr, env);
      }
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
          if (stmt.elseBlock.type === "If") {
            return this.execStmt(stmt.elseBlock, env);
          }
          return this.execBlock(stmt.elseBlock, new Environment(env));
        }
        return null;
      }
      case "For": {
        const iterVal = this.evalExpr(stmt.iter, env);
        let items: ObsidianValue[];

        if (Array.isArray(iterVal)) {
          items = iterVal;
        } else {
          throw new Error(`Cannot iterate over ${typeof iterVal}`);
        }

        for (const item of items) {
          this.tick();
          const loopEnv = new Environment(env);
          loopEnv.define(stmt.varName, item);
          const result = this.execBlock(stmt.body, loopEnv);
          if (result instanceof ReturnSignal) return result;
        }
        return null;
      }
    }
  }

  // ── Expression Evaluation ─────────────────────────────────────────────

  private evalExpr(expr: Expr, env: Environment): ObsidianValue {
    this.tick();
    switch (expr.type) {
      case "Int":
      case "Float":
        return expr.value;
      case "Str":
        return expr.value;
      case "FStr":
        return this.evalFString(expr, env);
      case "Bool":
        return expr.value;
      case "Ident":
        return env.get(expr.name);
      case "Binary":
        return this.evalBinary(expr.op, expr.left, expr.right, env);
      case "Unary":
        return this.evalUnary(expr.op, this.evalExpr(expr.expr, env));
      case "Call":
        return this.evalCall(expr.callee, expr.args, env);
      case "BlockExpr":
        return this.execBlock(expr.block, new Environment(env));
      case "Array": {
        return expr.elements.map(e => this.evalExpr(e, env));
      }
      case "Index": {
        const obj = this.evalExpr(expr.object, env);
        const idx = this.evalExpr(expr.index, env);
        if (Array.isArray(obj)) {
          if (typeof idx !== "number") throw new Error("Array index must be a number");
          if (idx < 0 || idx >= obj.length) throw new Error(`Index ${idx} out of bounds (length ${obj.length})`);
          return obj[idx];
        }
        if (typeof obj === "string") {
          if (typeof idx !== "number") throw new Error("String index must be a number");
          if (idx < 0 || idx >= obj.length) throw new Error(`Index ${idx} out of bounds (length ${obj.length})`);
          return obj[idx];
        }
        throw new Error(`Cannot index into ${this.typeOf(obj)}`);
      }
      case "IndexAssign": {
        const obj = this.evalExpr(expr.object, env);
        const idx = this.evalExpr(expr.index, env);
        const val = this.evalExpr(expr.value, env);
        if (Array.isArray(obj)) {
          if (typeof idx !== "number") throw new Error("Array index must be a number");
          if (idx < 0 || idx >= obj.length) throw new Error(`Index ${idx} out of bounds (length ${obj.length})`);
          obj[idx] = val;
          return val;
        }
        throw new Error(`Cannot index-assign into ${this.typeOf(obj)}`);
      }
      case "Range": {
        const start = this.evalExpr(expr.start, env);
        const end = this.evalExpr(expr.end, env);
        if (typeof start !== "number" || typeof end !== "number") {
          throw new Error("Range bounds must be numbers");
        }
        const arr: number[] = [];
        for (let i = start; i < end; i++) {
          arr.push(i);
        }
        return arr;
      }
      case "StructLit": {
        const def = this.structs.get(expr.name);
        if (!def) throw new Error(`Undefined struct: ${expr.name}`);
        const obj: ObsidianStruct = { __kind: "struct", __name: expr.name };
        for (const f of expr.fields) {
          obj[f.name] = this.evalExpr(f.value, env);
        }
        return obj;
      }
      case "FieldAccess": {
        const obj = this.evalExpr(expr.object, env);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          const val = (obj as Record<string, ObsidianValue>)[expr.field];
          if (val === undefined) throw new Error(`No field '${expr.field}' on ${this.typeOf(obj)}`);
          return val;
        }
        throw new Error(`Cannot access field '${expr.field}' on ${this.typeOf(obj)}`);
      }
      case "FieldAssign": {
        const obj = this.evalExpr(expr.object, env);
        const val = this.evalExpr(expr.value, env);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          (obj as Record<string, ObsidianValue>)[expr.field] = val;
          return val;
        }
        throw new Error(`Cannot assign field '${expr.field}' on ${this.typeOf(obj)}`);
      }
      case "EnumLit": {
        const def = this.enums.get(expr.enumName);
        if (!def) throw new Error(`Undefined enum: ${expr.enumName}`);
        const obj: ObsidianEnum = {
          __kind: "enum",
          __enumName: expr.enumName,
          __variant: expr.variant,
        };
        for (const f of expr.fields) {
          obj[f.name] = this.evalExpr(f.value, env);
        }
        return obj;
      }
      case "Match": {
        const subject = this.evalExpr(expr.subject, env);
        for (const arm of expr.arms) {
          const bindings = this.matchPattern(arm.pattern, subject);
          if (bindings !== null) {
            const matchEnv = new Environment(env);
            for (const [k, v] of Object.entries(bindings)) {
              matchEnv.define(k, v);
            }
            return this.evalExpr(arm.body, matchEnv);
          }
        }
        throw new Error("No matching arm in match expression");
      }
      case "Closure": {
        return {
          __kind: "closure" as const,
          params: expr.params,
          body: expr.body,
          env: env,
        };
      }
      case "MethodCall": {
        return this.evalMethodCall(expr.object, expr.method, expr.args, env);
      }
    }
  }

  // ── Pattern Matching ──────────────────────────────────────────────────

  private matchPattern(
    pattern: MatchPattern,
    value: ObsidianValue
  ): Record<string, ObsidianValue> | null {
    if (pattern.kind === "wildcard") {
      return {};
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as ObsidianEnum).__kind === "enum"
    ) {
      const enumVal = value as ObsidianEnum;
      if (
        enumVal.__enumName === pattern.enumName &&
        enumVal.__variant === pattern.variant
      ) {
        const bindings: Record<string, ObsidianValue> = {};
        // Get the enum definition to find field names in order
        const def = this.enums.get(pattern.enumName);
        if (def) {
          const variantDef = def.variants.find(v => v.name === pattern.variant);
          if (variantDef) {
            for (let i = 0; i < pattern.bindings.length; i++) {
              const fieldName = variantDef.fields[i]?.name ?? pattern.bindings[i];
              bindings[pattern.bindings[i]] = enumVal[fieldName] as ObsidianValue;
            }
          }
        }
        return bindings;
      }
    }

    return null;
  }

  // ── Unary and Binary Operations ───────────────────────────────────────

  private evalUnary(op: string, val: ObsidianValue): ObsidianValue {
    if (op === "neg") {
      if (typeof val === "number") return -val;
      throw new Error("Cannot negate non-number");
    }
    if (op === "!") {
      return !this.isTruthy(val);
    }
    throw new Error(`Unknown unary operator: ${op}`);
  }

  private evalBinary(
    op: string,
    leftExpr: Expr,
    rightExpr: Expr,
    env: Environment
  ): ObsidianValue {
    if (op === "=") {
      const val = this.evalExpr(rightExpr, env);
      if (leftExpr.type === "Ident") {
        env.define(leftExpr.name, val);
        return val;
      }
      throw new Error("Invalid assignment target");
    }

    const left = this.evalExpr(leftExpr, env);
    const right = this.evalExpr(rightExpr, env);

    switch (op) {
      case "+":
        if (typeof left === "number" && typeof right === "number") return left + right;
        if (typeof left === "string" && typeof right === "string") return left + right;
        break;
      case "-":
        if (typeof left === "number" && typeof right === "number") return left - right;
        break;
      case "*":
        if (typeof left === "number" && typeof right === "number") return left * right;
        break;
      case "/":
        if (typeof left === "number" && typeof right === "number") return left / right;
        break;
      case "%":
        if (typeof left === "number" && typeof right === "number") return left % right;
        break;
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        if (typeof left === "number" && typeof right === "number") return left < right;
        break;
      case "<=":
        if (typeof left === "number" && typeof right === "number") return left <= right;
        break;
      case ">":
        if (typeof left === "number" && typeof right === "number") return left > right;
        break;
      case ">=":
        if (typeof left === "number" && typeof right === "number") return left >= right;
        break;
      case "&&":
        return this.isTruthy(left) && this.isTruthy(right);
      case "||":
        return this.isTruthy(left) || this.isTruthy(right);
    }

    throw new Error(`Cannot apply '${op}' to ${this.typeOf(left)} and ${this.typeOf(right)}`);
  }

  // ── Function and Method Calls ─────────────────────────────────────────

  private evalCall(calleeExpr: Expr, argExprs: Expr[], env: Environment): ObsidianValue {
    // If callee is an Ident, check builtins first
    if (calleeExpr.type === "Ident") {
      const name = calleeExpr.name;
      const args = argExprs.map((a) => this.evalExpr(a, env));
      const builtin = this.tryBuiltin(name, args);
      if (builtin !== undefined) return builtin;

      // User-defined function
      const fn = this.functions.get(name);
      if (fn) {
        return this.callUserFn(fn, args);
      }

      // Variable that might be a closure
      try {
        const val = env.get(name);
        if (val && typeof val === "object" && !Array.isArray(val) && (val as ObsidianClosure).__kind === "closure") {
          return this.callClosure(val as ObsidianClosure, args);
        }
      } catch { /* not found */ }

      throw new Error(`Undefined function: ${name}`);
    }

    // Evaluate the callee expression (could be a closure)
    const callee = this.evalExpr(calleeExpr, env);
    const args = argExprs.map(a => this.evalExpr(a, env));

    if (callee && typeof callee === "object" && !Array.isArray(callee) && (callee as ObsidianClosure).__kind === "closure") {
      return this.callClosure(callee as ObsidianClosure, args);
    }

    throw new Error("Not callable");
  }

  private callUserFn(fn: FnItem, args: ObsidianValue[]): ObsidianValue {
    if (args.length !== fn.params.length) {
      throw new Error(`${fn.name} expects ${fn.params.length} arguments, got ${args.length}`);
    }

    const fnEnv = new Environment();
    for (let j = 0; j < fn.params.length; j++) {
      fnEnv.define(fn.params[j].name, args[j]);
    }

    const result = this.execBlock(fn.body, fnEnv);
    if (result instanceof ReturnSignal) return result.value;
    return result;
  }

  private callClosure(closure: ObsidianClosure, args: ObsidianValue[]): ObsidianValue {
    if (args.length !== closure.params.length) {
      throw new Error(`Closure expects ${closure.params.length} arguments, got ${args.length}`);
    }

    const closureEnv = new Environment(closure.env);
    for (let j = 0; j < closure.params.length; j++) {
      closureEnv.define(closure.params[j].name, args[j]);
    }

    const result = this.evalExpr(closure.body, closureEnv);
    if (result instanceof ReturnSignal) return (result as ReturnSignal).value;
    return result;
  }

  // ── Method Calls ──────────────────────────────────────────────────────

  private evalMethodCall(
    objectExpr: Expr,
    method: string,
    argExprs: Expr[],
    env: Environment
  ): ObsidianValue {
    const obj = this.evalExpr(objectExpr, env);
    const args = argExprs.map(a => this.evalExpr(a, env));

    // String methods
    if (typeof obj === "string") {
      switch (method) {
        case "len": return obj.length;
        case "to_upper": return obj.toUpperCase();
        case "to_lower": return obj.toLowerCase();
        case "trim": return obj.trim();
        case "contains": {
          if (typeof args[0] !== "string") throw new Error("contains expects a string argument");
          return obj.includes(args[0]);
        }
        case "starts_with": {
          if (typeof args[0] !== "string") throw new Error("starts_with expects a string argument");
          return obj.startsWith(args[0]);
        }
        case "ends_with": {
          if (typeof args[0] !== "string") throw new Error("ends_with expects a string argument");
          return obj.endsWith(args[0]);
        }
        case "split": {
          if (typeof args[0] !== "string") throw new Error("split expects a string argument");
          return obj.split(args[0]);
        }
        case "replace": {
          if (typeof args[0] !== "string" || typeof args[1] !== "string")
            throw new Error("replace expects two string arguments");
          return obj.replace(args[0], args[1]);
        }
        case "chars": return Array.from(obj);
        case "char_at": {
          if (typeof args[0] !== "number") throw new Error("char_at expects a number");
          return obj.charAt(args[0]);
        }
        default:
          throw new Error(`No method '${method}' on string`);
      }
    }

    // Array methods
    if (Array.isArray(obj)) {
      switch (method) {
        case "len": return obj.length;
        case "push": {
          obj.push(args[0]);
          return null;
        }
        case "pop": {
          if (obj.length === 0) throw new Error("Cannot pop from empty array");
          return obj.pop()!;
        }
        case "map": {
          const fn = args[0];
          if (!fn || typeof fn !== "object" || (fn as ObsidianClosure).__kind !== "closure") {
            throw new Error("map expects a closure argument");
          }
          return obj.map(item => this.callClosure(fn as ObsidianClosure, [item]));
        }
        case "filter": {
          const fn = args[0];
          if (!fn || typeof fn !== "object" || (fn as ObsidianClosure).__kind !== "closure") {
            throw new Error("filter expects a closure argument");
          }
          return obj.filter(item => this.isTruthy(this.callClosure(fn as ObsidianClosure, [item])));
        }
        case "reduce": {
          const fn = args[0];
          const init = args[1];
          if (!fn || typeof fn !== "object" || (fn as ObsidianClosure).__kind !== "closure") {
            throw new Error("reduce expects a closure argument");
          }
          let acc = init;
          for (const item of obj) {
            acc = this.callClosure(fn as ObsidianClosure, [acc, item]);
          }
          return acc;
        }
        case "contains": {
          return obj.some(item => item === args[0]);
        }
        case "reverse": {
          return [...obj].reverse();
        }
        case "join": {
          if (typeof args[0] !== "string") throw new Error("join expects a string separator");
          return obj.map(x => x === null || x === undefined ? "null" : String(x)).join(args[0]);
        }
        case "slice": {
          const start = typeof args[0] === "number" ? args[0] : 0;
          const end = typeof args[1] === "number" ? args[1] : obj.length;
          return obj.slice(start, end);
        }
        default:
          throw new Error(`No method '${method}' on array`);
      }
    }

    throw new Error(`Cannot call method '${method}' on ${this.typeOf(obj)}`);
  }

  // ── Built-in Functions ────────────────────────────────────────────────

  private tryBuiltin(name: string, args: ObsidianValue[]): ObsidianValue | undefined {
    switch (name) {
      case "print": {
        const str = args.map(a => this.formatValue(a)).join(" ");
        this.output.push(str);
        return null;
      }
      case "println": {
        const str = args.map(a => this.formatValue(a)).join(" ");
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
        if (typeof args[0] === "string") return args[0].length;
        if (Array.isArray(args[0])) return args[0].length;
        throw new Error("len expects a string or array");
      }
      case "to_string": {
        return this.formatValue(args[0]);
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
      case "pow": {
        if (typeof args[0] !== "number" || typeof args[1] !== "number") throw new Error("pow expects numbers");
        return Math.pow(args[0], args[1]);
      }
      case "push": {
        if (!Array.isArray(args[0])) throw new Error("push expects an array as first argument");
        args[0].push(args[1]);
        return null;
      }
      case "pop": {
        if (!Array.isArray(args[0])) throw new Error("pop expects an array");
        if (args[0].length === 0) throw new Error("Cannot pop from empty array");
        return args[0].pop()!;
      }
      case "type_of": {
        return this.typeOf(args[0]);
      }
      case "sin": {
        if (typeof args[0] !== "number") throw new Error("sin expects a number");
        return Math.sin(args[0]);
      }
      case "cos": {
        if (typeof args[0] !== "number") throw new Error("cos expects a number");
        return Math.cos(args[0]);
      }
      case "tan": {
        if (typeof args[0] !== "number") throw new Error("tan expects a number");
        return Math.tan(args[0]);
      }
      case "log": {
        if (typeof args[0] !== "number") throw new Error("log expects a number");
        return Math.log(args[0]);
      }
      case "log2": {
        if (typeof args[0] !== "number") throw new Error("log2 expects a number");
        return Math.log2(args[0]);
      }
      case "log10": {
        if (typeof args[0] !== "number") throw new Error("log10 expects a number");
        return Math.log10(args[0]);
      }
      case "exp": {
        if (typeof args[0] !== "number") throw new Error("exp expects a number");
        return Math.exp(args[0]);
      }
      case "random": {
        return Math.random();
      }
    }

    return undefined;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private evalFString(expr: FStrExpr, env: Environment): string {
    let result = "";
    for (const part of expr.parts) {
      if (part.kind === "lit") {
        result += part.value;
      } else {
        const val = this.evalExpr(part.expr, env);
        result += val === null || val === undefined ? "null" : String(val);
      }
    }
    return result;
  }

  private formatValue(val: ObsidianValue): string {
    if (val === null || val === undefined) return "null";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "string") return val;
    if (Array.isArray(val)) {
      return "[" + val.map(v => this.formatValue(v)).join(", ") + "]";
    }
    if (typeof val === "object") {
      if ((val as ObsidianStruct).__kind === "struct") {
        const s = val as ObsidianStruct;
        const fields = Object.entries(s)
          .filter(([k]) => !k.startsWith("__"))
          .map(([k, v]) => `${k}: ${this.formatValue(v as ObsidianValue)}`)
          .join(", ");
        return `${s.__name} { ${fields} }`;
      }
      if ((val as ObsidianEnum).__kind === "enum") {
        const e = val as ObsidianEnum;
        const fields = Object.entries(e)
          .filter(([k]) => !k.startsWith("__"))
          .map(([k, v]) => `${k}: ${this.formatValue(v as ObsidianValue)}`)
          .join(", ");
        return fields
          ? `${e.__enumName}::${e.__variant} { ${fields} }`
          : `${e.__enumName}::${e.__variant}`;
      }
      if ((val as ObsidianClosure).__kind === "closure") {
        return "<closure>";
      }
    }
    return String(val);
  }

  private typeOf(val: ObsidianValue): string {
    if (val === null || val === undefined) return "null";
    if (typeof val === "number") return "number";
    if (typeof val === "string") return "string";
    if (typeof val === "boolean") return "bool";
    if (Array.isArray(val)) return "array";
    if (typeof val === "object") {
      if ((val as ObsidianStruct).__kind === "struct") return (val as ObsidianStruct).__name;
      if ((val as ObsidianEnum).__kind === "enum") return (val as ObsidianEnum).__enumName;
      if ((val as ObsidianClosure).__kind === "closure") return "closure";
    }
    return "unknown";
  }

  private isTruthy(val: ObsidianValue): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    if (typeof val === "string") return val.length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  }
}
