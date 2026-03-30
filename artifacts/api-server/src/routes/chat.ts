import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_LENGTH = 50;
const MAX_HISTORY_MESSAGE_LENGTH = 8000;
const VALID_ROLES = new Set(["user", "assistant"]);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

const OBSIDIAN_SYSTEM_PROMPT = `You are OBSIDIAN AI — the world's most advanced coding assistant for the OBSIDIAN programming language. You speak OBSIDIAN fluently and think in its paradigms.

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

router.post("/chat", async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
      return;
    }

    const { message, history } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: "Message too long" });
      return;
    }

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: OBSIDIAN_SYSTEM_PROMPT },
    ];

    if (Array.isArray(history)) {
      const trimmedHistory = history.slice(-MAX_HISTORY_LENGTH);
      for (const msg of trimmedHistory) {
        if (
          msg &&
          typeof msg.role === "string" &&
          VALID_ROLES.has(msg.role) &&
          typeof msg.content === "string" &&
          msg.content.length <= MAX_HISTORY_MESSAGE_LENGTH
        ) {
          chatMessages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }
    }

    chatMessages.push({ role: "user", content: message });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    req.log.error({ err: error }, "Chat stream error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
