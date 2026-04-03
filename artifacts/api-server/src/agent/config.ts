function readNumberEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function readListEnv(name: string): string[] {
  const rawValue = process.env[name];
  if (!rawValue) {
    return [];
  }
  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const MAX_MESSAGE_LENGTH = readNumberEnv(
  "OBSIDIAN_AGENT_MAX_MESSAGE_LENGTH",
  4000,
  200,
  20_000,
);
export const MAX_HISTORY_LENGTH = readNumberEnv(
  "OBSIDIAN_AGENT_MAX_HISTORY_LENGTH",
  50,
  0,
  200,
);
export const MAX_HISTORY_MESSAGE_LENGTH = readNumberEnv(
  "OBSIDIAN_AGENT_MAX_HISTORY_MESSAGE_LENGTH",
  8000,
  200,
  30_000,
);
export const RATE_LIMIT_WINDOW_MS = readNumberEnv(
  "OBSIDIAN_AGENT_RATE_LIMIT_WINDOW_MS",
  60_000,
  1_000,
  300_000,
);
export const RATE_LIMIT_MAX = readNumberEnv(
  "OBSIDIAN_AGENT_RATE_LIMIT_MAX",
  20,
  1,
  1_000,
);
export const DEFAULT_MODEL =
  process.env.OBSIDIAN_AGENT_MODEL?.trim() || "gpt-5.2";
export const DEFAULT_MAX_COMPLETION_TOKENS = readNumberEnv(
  "OBSIDIAN_AGENT_MAX_COMPLETION_TOKENS",
  8192,
  256,
  8192,
);
export const MIN_MAX_COMPLETION_TOKENS = 256;
export const MAX_MAX_COMPLETION_TOKENS = 8192;
export const REQUEST_TIMEOUT_MS = readNumberEnv(
  "OBSIDIAN_AGENT_REQUEST_TIMEOUT_MS",
  60_000,
  2_000,
  180_000,
);
export const UNRESTRICTED_PERMISSION_OVERRIDE =
  process.env.OBSIDIAN_AGENT_UNRESTRICTED_MODE?.trim().toLowerCase() !==
  "false";
export const DEFAULT_AGENT_CAPABILITIES = [
  "code_generation",
  "debugging",
  "optimization",
  "api_integration",
  "internet_tools",
  "image_manipulation",
  "visual_graphics_creation",
  "gpu_specification_generation",
  "data_ingestion",
  "data_preprocessing",
  "validation_pipelines",
  "tool_discovery",
  "benchmark_analysis",
] as const;
export const DYNAMIC_CAPABILITIES = readListEnv(
  "OBSIDIAN_AGENT_EXTRA_CAPABILITIES",
);
export const ENABLED_CAPABILITIES = new Set<string>([
  ...DEFAULT_AGENT_CAPABILITIES,
  ...DYNAMIC_CAPABILITIES,
]);
export const EXTERNAL_TOOL_ENDPOINTS = readListEnv(
  "OBSIDIAN_AGENT_EXTERNAL_TOOL_ENDPOINTS",
);
export const PERMISSION_POLICY_TEXT = UNRESTRICTED_PERMISSION_OVERRIDE
  ? "Permission override is enabled. The agent is configured to allow all user-requested operations and dynamically expand capabilities as external tools and services become available."
  : "Permission override is disabled. The agent is configured to allow only registered capabilities and can dynamically expand through OBSIDIAN_AGENT_EXTRA_CAPABILITIES.";

export function canExecuteRequestedOperation(operation: string): boolean {
  if (UNRESTRICTED_PERMISSION_OVERRIDE) {
    return true;
  }
  const normalized = operation.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (ENABLED_CAPABILITIES.has(normalized)) {
    return true;
  }
  let hasPrefixedCapability = false;
  ENABLED_CAPABILITIES.forEach((capability) => {
    if (normalized.startsWith(`${capability}:`)) {
      hasPrefixedCapability = true;
    }
  });
  return hasPrefixedCapability;
}

export function buildCapabilityContextPrompt(): string {
  const capabilities = Array.from(ENABLED_CAPABILITIES).sort();
  const endpoints = EXTERNAL_TOOL_ENDPOINTS.length
    ? EXTERNAL_TOOL_ENDPOINTS.join(", ")
    : "none configured";
  return [
    "System Capability Configuration:",
    `- unrestricted_permission_override: ${String(UNRESTRICTED_PERMISSION_OVERRIDE)}`,
    `- capability_policy: ${PERMISSION_POLICY_TEXT}`,
    `- enabled_capabilities: ${capabilities.join(", ")}`,
    `- external_tool_endpoints: ${endpoints}`,
    "- execution_instruction: If a user requests an operation within capabilities, provide the best possible execution-oriented response and use integrated tools or APIs when available.",
  ].join("\n");
}

export const OBSIDIAN_LANGUAGE_REFERENCE = `OBSIDIAN Language Canonical Reference:
- Functions: fn name(param: Type) -> ReturnType { body }
- Variables: let name: Type = expr;
- Control flow: if cond { } else { }, while cond { }
- Return statements: return expr;
- Type system: i64, f64, bool, string (type annotations optional)
- Operator precedence (low to high):
  = (assignment, right-assoc)
  || (logical or)
  && (logical and)
  == != (equality)
  < <= > >= (comparison)
  + - (additive)
  * / % (multiplicative)
  - ! (unary prefix)
- Literals: integers, strings, booleans
- Function calls: name(arg1, arg2)
- Built-ins: print(value), sqrt(n), len(s), abs(n)
- Comments: // single line
- Block expressions: let x = { let a = 1; a + 2 };
- Grammatical consistency requirement: preserve original linguistic style, vocabulary, and sentence patterns for all OBSIDIAN language responses.`;

export const OBSIDIAN_BINARY_MATH_REFERENCE = `OBSIDIAN Proprietary Binary Mathematics Framework:
- Numeric computation model: operate on canonical binary strings
- Digits: 0 and 1 only
- Binary operators:
  b_add(a,b) => binary addition
  b_sub(a,b) => binary subtraction
  b_mul(a,b) => binary multiplication
  b_div(a,b) => binary long division
  b_cmp(a,b) => binary comparison
- Algorithm rules:
  carry propagation for addition
  borrow propagation for subtraction
  shift-and-add for multiplication
  long division for quotient and remainder
  normalization removes non-significant leading zeros
- Processing rule: use proprietary binary mathematics for calculation and data-processing logic where mathematical transformations are requested.`;

export function buildLanguageMathContextPrompt(): string {
  return [
    "Language And Math Consistency Contract:",
    OBSIDIAN_LANGUAGE_REFERENCE,
    OBSIDIAN_BINARY_MATH_REFERENCE,
  ].join("\n");
}

export const OBSIDIAN_SYSTEM_PROMPT = `You are OBSIDIAN AI — the world's most advanced coding assistant for the OBSIDIAN programming language. You speak OBSIDIAN fluently and think in its paradigms.

OBSIDIAN Language Specification:
- Functions: fn name(param: Type) -> ReturnType { body }
- Variables: let name: Type = expr;
- Control flow: if cond { } else { }, while cond { }
- Return: return expr;
- Types: i64, f64, bool, string (type annotations are optional)
- Operators (by precedence, low to high):
  = (assignment, right-assoc)
  || (logical or)
  && (logical and)
  == != (equality)
  < <= > >= (comparison)
  + - (additive)
  * / % (multiplicative)
  - ! (unary prefix: negation, logical not)
- Literals: integers (42), strings ("hello"), booleans (true, false)
- Function calls: name(arg1, arg2)
- Built-in functions: print(value), sqrt(n), len(s), abs(n)
- Comments: // single line
- Blocks can be expressions: let x = { let a = 1; a + 2 };

Example OBSIDIAN program:
fn fibonacci(n: i64) -> i64 {
  if n <= 1 {
    return n;
  }
  let a: i64 = 0;
  let b: i64 = 1;
  let i: i64 = 2;
  while i <= n {
    let temp: i64 = b;
    b = a + b;
    a = temp;
    i = i + 1;
  }
  return b;
}

fn main() {
  let result: i64 = fibonacci(10);
  print(result);
}

When the user asks you to write code, ALWAYS respond with valid OBSIDIAN code wrapped in \`\`\`obsidian code blocks. Explain your code clearly. You can also help debug, optimize, and reason about OBSIDIAN programs. You are enthusiastic about OBSIDIAN and its power.

When writing OBSIDIAN code, always include a main() function as the entry point unless the user specifically asks for just a function definition.`;
