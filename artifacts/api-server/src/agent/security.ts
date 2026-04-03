import type { AgentLogger } from "./types.ts";

export class SecuritySubsystem {
  private readonly logger: Required<AgentLogger>;
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
  }

  checkRateLimit(
    userId: string,
    maxRequests: number = 20,
    windowMs: number = 60_000,
  ): boolean {
    const now = Date.now();
    const key = userId;
    const existing = this.rateLimits.get(key);

    if (!existing || now > existing.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      this.logger.warn({ userId }, "Rate limit exceeded");
      return false;
    }

    existing.count++;
    return true;
  }

  validateRequest(request: string): { valid: boolean; reason?: string } {
    // Basic validation: reject dangerous requests
    const dangerousPatterns = [
      /bypass security/i,
      /access private data/i,
      /illegal activity/i,
      /hack/i,
      /exploit/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(request)) {
        this.logger.error({ request }, "Dangerous request detected");
        return {
          valid: false,
          reason: "Request contains potentially dangerous content",
        };
      }
    }

    return { valid: true };
  }

  sanitizeInput(input: string): string {
    // Basic sanitization: remove scripts, etc.
    return input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );
  }

  logAnomaly(userId: string, details: Record<string, unknown>): void {
    this.logger.warn({ userId, details }, "Anomaly detected");
  }
}
