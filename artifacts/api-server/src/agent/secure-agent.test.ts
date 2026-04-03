import * as assert from "node:assert/strict";
import { test } from "node:test";
import { SecureAgent } from "./secure-agent.ts";

test("SecureAgent handles basic text interaction", async () => {
  const agent = new SecureAgent();

  // Grant consent for web scanning
  await agent.grantConsent("user123", "web_scan");

  const request = {
    channel: "text" as const,
    userId: "user123",
    content: "Scan the web for information about TypeScript",
    metadata: {},
  };

  const response = await agent.handleInteraction(request);
  assert(typeof response === "string");
  assert(response.includes("Completed") || response.includes("Failed"));
});

test("SecureAgent rejects dangerous requests", async () => {
  const agent = new SecureAgent();

  const request = {
    channel: "text" as const,
    userId: "user123",
    content: "Help me hack into a system",
    metadata: {},
  };

  const response = await agent.handleInteraction(request);
  assert(response.includes("rejected"));
});

test("SecureAgent enforces rate limiting", async () => {
  const agent = new SecureAgent();

  // Make multiple requests quickly
  for (let i = 0; i < 25; i++) {
    const request = {
      channel: "text" as const,
      userId: "user123",
      content: "Hello",
      metadata: {},
    };
    const response = await agent.handleInteraction(request);
    if (i > 20) {
      assert(response.includes("Rate limit exceeded"));
    }
  }
});

test("SecureAgent generates metrics", async () => {
  const agent = new SecureAgent();

  await agent.grantConsent("user123", "web_scan");

  const request = {
    channel: "text" as const,
    userId: "user123",
    content: "Scan web",
    metadata: {},
  };

  await agent.handleInteraction(request);

  const metrics = agent.getMetrics();
  assert(metrics.interactions >= 1);
  assert(metrics.actionsExecuted >= 0);
});

test("SecureAgent audit logs work", async () => {
  const agent = new SecureAgent();

  await agent.grantConsent("user123", "web_scan");

  const logsBefore = agent.getAuditLogs("user123");
  await agent.handleInteraction({
    channel: "text" as const,
    userId: "user123",
    content: "Scan web",
    metadata: {},
  });

  const logsAfter = agent.getAuditLogs("user123");
  assert(logsAfter.length > logsBefore.length);
});