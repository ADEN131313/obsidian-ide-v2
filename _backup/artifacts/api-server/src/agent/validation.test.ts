import * as assert from "node:assert/strict";
import { test } from "node:test";
import { validateRequestBody } from "./validation.ts";

test("validateRequestBody normalizes valid payloads", () => {
  const result = validateRequestBody({
    message: "  hello  ",
    history: [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "system", content: "invalid" },
      { role: "assistant", content: "" },
    ],
    maxCompletionTokens: 99,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.message, "hello");
    assert.equal(result.value.history.length, 2);
    assert.equal(result.value.maxCompletionTokens, 256);
  }
});

test("validateRequestBody rejects invalid message", () => {
  const noMessage = validateRequestBody({ message: 123 });
  const tooLong = validateRequestBody({ message: "x".repeat(5000) });

  assert.equal(noMessage.ok, false);
  if (!noMessage.ok) {
    assert.equal(noMessage.error, "message is required");
  }

  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) {
    assert.equal(tooLong.error, "Message too long");
  }
});
