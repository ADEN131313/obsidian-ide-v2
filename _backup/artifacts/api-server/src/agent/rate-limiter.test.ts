import * as assert from "node:assert/strict";
import { test } from "node:test";
import { SlidingWindowRateLimiter } from "./rate-limiter.ts";

test("SlidingWindowRateLimiter allows requests within the limit", () => {
  const limiter = new SlidingWindowRateLimiter(2, 1_000);
  const first = limiter.check("127.0.0.1", 1_000);
  const second = limiter.check("127.0.0.1", 1_100);
  const third = limiter.check("127.0.0.1", 1_200);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test("SlidingWindowRateLimiter resets after window", () => {
  const limiter = new SlidingWindowRateLimiter(1, 500);
  const first = limiter.check("client-a", 10);
  const second = limiter.check("client-a", 400);
  const third = limiter.check("client-a", 700);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(third.allowed, true);
});
