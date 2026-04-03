type RateLimitState = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export class SlidingWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitState>();
  private lastPruneAt = 0;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    this.prune(now);
    const existing = this.entries.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + this.windowMs;
      this.entries.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        limit: this.maxRequests,
        remaining: Math.max(0, this.maxRequests - 1),
        resetAt,
      };
    }

    existing.count += 1;
    const remaining = Math.max(0, this.maxRequests - existing.count);
    return {
      allowed: existing.count <= this.maxRequests,
      limit: this.maxRequests,
      remaining,
      resetAt: existing.resetAt,
    };
  }

  size(): number {
    return this.entries.size;
  }

  private prune(now: number) {
    if (now - this.lastPruneAt < this.windowMs) {
      return;
    }
    this.lastPruneAt = now;
    this.entries.forEach((value, key) => {
      if (now >= value.resetAt) {
        this.entries.delete(key);
      }
    });
  }
}
