import * as assert from "node:assert/strict";
import { test } from "node:test";
import { ObsidianChatAgent, type AgentClient } from "./chat-agent.ts";

function createClientFromChunks(chunks: string[]): AgentClient {
  return {
    chat: {
      completions: {
        create: async () =>
          (async function* () {
            for (const chunk of chunks) {
              yield { choices: [{ delta: { content: chunk } }] };
            }
          })(),
      },
    },
  };
}

test("ObsidianChatAgent streams all content chunks", async () => {
  const client = createClientFromChunks(["Hello", " ", "World"]);
  const agent = new ObsidianChatAgent(client);
  const tokens: string[] = [];

  const result = await agent.streamCompletion(
    {
      message: "Hi",
      history: [{ role: "user", content: "Earlier prompt" }],
    },
    {
      onToken: (content) => tokens.push(content),
    },
  );

  assert.deepEqual(tokens, ["Hello", " ", "World"]);
  assert.equal(result.chunks, 3);
  assert.equal(typeof result.durationMs, "number");
});

test("ObsidianChatAgent maps upstream errors", async () => {
  const client: AgentClient = {
    chat: {
      completions: {
        create: async () => {
          throw { status: 429, code: "rate_limit_exceeded" };
        },
      },
    },
  };
  const agent = new ObsidianChatAgent(client);

  await assert.rejects(
    agent.streamCompletion(
      {
        message: "Hi",
        history: [],
      },
      {
        onToken: () => undefined,
      },
    ),
    (error: unknown) => {
      const typed = error as { statusCode?: number; publicMessage?: string };
      return (
        typed.statusCode === 429 &&
        typed.publicMessage ===
          "Upstream rate limit reached. Please retry shortly."
      );
    },
  );
});

test("ObsidianChatAgent reuses cached completion for identical requests", async () => {
  let createCalls = 0;
  const client: AgentClient = {
    chat: {
      completions: {
        create: async () => {
          createCalls += 1;
          return (async function* () {
            yield { choices: [{ delta: { content: "cached-content" } }] };
          })();
        },
      },
    },
  };
  const agent = new ObsidianChatAgent(client);
  const firstTokens: string[] = [];
  const secondTokens: string[] = [];

  await agent.streamCompletion(
    {
      message: "repeat",
      history: [],
    },
    {
      onToken: (content) => firstTokens.push(content),
    },
  );

  await agent.streamCompletion(
    {
      message: "repeat",
      history: [],
    },
    {
      onToken: (content) => secondTokens.push(content),
    },
  );

  assert.equal(createCalls, 1);
  assert.deepEqual(firstTokens, ["cached-content"]);
  assert.deepEqual(secondTokens, ["cached-content"]);
});
