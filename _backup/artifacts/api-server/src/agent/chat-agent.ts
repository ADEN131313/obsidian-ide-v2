import {
  buildCapabilityContextPrompt,
  buildLanguageMathContextPrompt,
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_MODEL,
  OBSIDIAN_SYSTEM_PROMPT,
  REQUEST_TIMEOUT_MS,
} from "./config.ts";
import { normalizeLogger } from "./logger.ts";
import type { AgentLogger, AgentMessage, ChatMessage } from "./types.ts";

type ChatCompletionsClient = {
  create: (
    params: {
      model: string;
      max_completion_tokens: number;
      messages: AgentMessage[];
      stream: true;
    },
    options?: { signal?: AbortSignal },
  ) => Promise<
    AsyncIterable<{ choices?: Array<{ delta?: { content?: string } }> }>
  >;
};

export type AgentClient = {
  chat: {
    completions: ChatCompletionsClient;
  };
};

export type StreamRequest = {
  message: string;
  history: ChatMessage[];
  model?: string;
  maxCompletionTokens?: number;
};

export type StreamCallbacks = {
  onToken: (content: string) => void;
};

export type StreamResult = {
  chunks: number;
  durationMs: number;
};

export type AgentStreamError = {
  statusCode: number;
  publicMessage: string;
  code: string;
};

export class ObsidianChatAgent {
  private readonly logger: Required<AgentLogger>;
  private readonly responseCache = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly cacheTtlMs = 15_000;
  private readonly client: AgentClient;
  private readonly logger: Required<AgentLogger>;

  constructor(client: AgentClient, logger?: AgentLogger) {
    this.client = client;
    this.logger = normalizeLogger(logger);
  }

  async streamCompletion(
    request: StreamRequest,
    callbacks: StreamCallbacks,
  ): Promise<StreamResult> {
    const startedAt = Date.now();
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      REQUEST_TIMEOUT_MS,
    );
    const model = request.model ?? DEFAULT_MODEL;
    const maxCompletionTokens =
      request.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS;
    const cacheKey = this.createCacheKey(request, model, maxCompletionTokens);
    const cached = this.readCache(cacheKey, startedAt);
    if (cached) {
      callbacks.onToken(cached);
      return { chunks: 1, durationMs: 0 };
    }

    try {
      this.logger.info(
        {
          model,
          historyLength: request.history.length,
          maxCompletionTokens,
        },
        "chat.completion.start",
      );

      let stream;
      let retries = 3;
      while (retries > 0) {
        try {
          stream = await this.client.chat.completions.create(
            {
              model,
              max_completion_tokens: maxCompletionTokens,
              messages: this.buildMessages(request.message, request.history),
              stream: true,
            },
            { signal: abortController.signal },
          );
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          this.logger.warn(
            { err: error },
            `AI request failed, retries left: ${retries}`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1s
        }
      }

      let chunks = 0;
      let contentBuffer = "";
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (!content) {
          continue;
        }
        chunks += 1;
        contentBuffer += content;
        callbacks.onToken(content);
      }

      const durationMs = Date.now() - startedAt;
      this.writeCache(cacheKey, contentBuffer, startedAt + durationMs);
      this.logger.info(
        { chunks, durationMs, model },
        "chat.completion.success",
      );
      return { chunks, durationMs };
    } catch (error) {
      this.logger.error(
        {
          error,
          model,
          historyLength: request.history.length,
        },
        "chat.completion.failure",
      );
      throw this.mapError(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildMessages(
    message: string,
    history: ChatMessage[],
  ): AgentMessage[] {
    const messages: AgentMessage[] = [
      { role: "system", content: OBSIDIAN_SYSTEM_PROMPT },
      { role: "system", content: buildCapabilityContextPrompt() },
      { role: "system", content: buildLanguageMathContextPrompt() },
    ];

    for (const item of history) {
      messages.push({
        role: item.role,
        content: item.content,
      });
    }

    messages.push({ role: "user", content: message });
    return messages;
  }

  private mapError(error: unknown): AgentStreamError {
    const status = this.readNumber(error, "status");
    const code = this.readString(error, "code") ?? "unknown_error";
    if (status === 429) {
      return {
        statusCode: 429,
        publicMessage: "Upstream rate limit reached. Please retry shortly.",
        code,
      };
    }
    if (status === 401 || status === 403) {
      return {
        statusCode: 502,
        publicMessage: "Agent authentication error.",
        code,
      };
    }
    if (status === 400) {
      return {
        statusCode: 400,
        publicMessage: "Invalid chat request.",
        code,
      };
    }
    if (status === 408 || code === "ABORT_ERR") {
      return {
        statusCode: 504,
        publicMessage: "Agent response timed out.",
        code: code === "unknown_error" ? "timeout" : code,
      };
    }
    return {
      statusCode: 502,
      publicMessage: "Upstream AI service error.",
      code,
    };
  }

  private createCacheKey(
    request: StreamRequest,
    model: string,
    maxCompletionTokens: number,
  ): string {
    return JSON.stringify({
      model,
      maxCompletionTokens,
      message: request.message,
      history: request.history,
    });
  }

  private readCache(key: string, now: number): string | undefined {
    const entry = this.responseCache.get(key);
    if (!entry) {
      return undefined;
    }
    if (now >= entry.expiresAt) {
      this.responseCache.delete(key);
      return undefined;
    }
    this.logger.debug({ keySize: key.length }, "chat.completion.cache.hit");
    return entry.value;
  }

  private writeCache(key: string, value: string, now: number) {
    if (!value) {
      return;
    }
    this.responseCache.set(key, { value, expiresAt: now + this.cacheTtlMs });
    if (this.responseCache.size > 200) {
      const firstKey = this.responseCache.keys().next().value;
      if (typeof firstKey === "string") {
        this.responseCache.delete(firstKey);
      }
    }
  }

  private readNumber(input: unknown, key: string): number | undefined {
    if (!input || typeof input !== "object") {
      return undefined;
    }
    const value = (input as Record<string, unknown>)[key];
    return typeof value === "number" ? value : undefined;
  }

  private readString(input: unknown, key: string): string | undefined {
    if (!input || typeof input !== "object") {
      return undefined;
    }
    const value = (input as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
}
