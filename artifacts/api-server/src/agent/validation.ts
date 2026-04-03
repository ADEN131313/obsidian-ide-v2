import {
  MAX_HISTORY_LENGTH,
  MAX_HISTORY_MESSAGE_LENGTH,
  MAX_MAX_COMPLETION_TOKENS,
  MAX_MESSAGE_LENGTH,
  MIN_MAX_COMPLETION_TOKENS,
} from "./config.ts";
import type { ChatMessage, ChatRequestBody } from "./types.ts";

const VALID_ROLES = new Set(["user", "assistant"]);

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; statusCode: number; error: string };

export type NormalizedRequest = {
  message: string;
  history: ChatMessage[];
  model?: string;
  maxCompletionTokens?: number;
};

export function validateRequestBody(
  body: ChatRequestBody,
): ValidationResult<NormalizedRequest> {
  if (!body || typeof body !== "object") {
    return { ok: false, statusCode: 400, error: "Invalid request body" };
  }

  if (typeof body.message !== "string") {
    return { ok: false, statusCode: 400, error: "message is required" };
  }

  const message = body.message.trim();
  if (!message) {
    return { ok: false, statusCode: 400, error: "message is required" };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, statusCode: 400, error: "Message too long" };
  }

  const history = sanitizeHistory(body.history);
  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : undefined;
  const maxCompletionTokens = normalizeMaxCompletionTokens(
    body.maxCompletionTokens,
  );

  return {
    ok: true,
    value: {
      message,
      history,
      model,
      maxCompletionTokens,
    },
  };
}

export function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  const trimmed = history.slice(-MAX_HISTORY_LENGTH);
  const sanitized: ChatMessage[] = [];

  for (const item of trimmed) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const value = item as { role?: unknown; content?: unknown };
    if (typeof value.role !== "string" || !VALID_ROLES.has(value.role)) {
      continue;
    }
    if (typeof value.content !== "string") {
      continue;
    }
    if (!value.content.trim()) {
      continue;
    }
    if (value.content.length > MAX_HISTORY_MESSAGE_LENGTH) {
      continue;
    }
    sanitized.push({
      role: value.role as ChatMessage["role"],
      content: value.content,
    });
  }

  return sanitized;
}

function normalizeMaxCompletionTokens(input: unknown): number | undefined {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return undefined;
  }

  const rounded = Math.floor(input);
  if (rounded < MIN_MAX_COMPLETION_TOKENS) {
    return MIN_MAX_COMPLETION_TOKENS;
  }
  if (rounded > MAX_MAX_COMPLETION_TOKENS) {
    return MAX_MAX_COMPLETION_TOKENS;
  }
  return rounded;
}
