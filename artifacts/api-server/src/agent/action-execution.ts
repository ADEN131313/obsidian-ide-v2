import type { Action, AgentLogger, ConsentRecord, AuditLog } from "./types.ts";

export class ActionExecutionSubsystem {
  private readonly logger: Required<AgentLogger>;
  private consents: ConsentRecord[] = [];
  private auditLogs: AuditLog[] = [];

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
  }

  async checkConsent(userId: string, purpose: string): Promise<boolean> {
    const consent = this.consents.find(
      (c) => c.userId === userId && c.purpose === purpose,
    );
    if (
      !consent ||
      !consent.granted ||
      (consent.expiresAt && Date.now() > consent.expiresAt)
    ) {
      return false;
    }
    return true;
  }

  async grantConsent(
    userId: string,
    purpose: string,
    durationMs?: number,
  ): Promise<void> {
    const expiresAt = durationMs ? Date.now() + durationMs : undefined;
    this.consents.push({
      userId,
      purpose,
      granted: true,
      timestamp: Date.now(),
      expiresAt,
    });
    this.auditLogs.push({
      id: crypto.randomUUID(),
      userId,
      action: "consent_granted",
      timestamp: Date.now(),
      details: { purpose, expiresAt },
      riskLevel: "low",
    });
    this.logger.info({ userId, purpose }, "Consent granted");
  }

  async executeAction(
    action: Action,
    userId: string,
  ): Promise<Record<string, unknown>> {
    // Risk assessment
    if (action.riskLevel === "high") {
      this.logger.warn(
        { actionId: action.id },
        "High-risk action requires manual review",
      );
      throw new Error("High-risk action requires human oversight");
    }

    // Consent check
    if (action.requiresConsent) {
      const hasConsent = await this.checkConsent(userId, action.type);
      if (!hasConsent) {
        throw new Error("User consent required for this action");
      }
    }

    // Simulate execution based on type
    let result: Record<string, unknown> = {};

    switch (action.type) {
      case "web_scan":
        if (
          action.parameters.url &&
          typeof action.parameters.url === "string"
        ) {
          // Safe web scan with data minimization
          try {
            const response = await fetch(action.parameters.url);
            const text = await response.text();
            // Minimize data: extract title and summary
            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : "No title";
            const summary = text.substring(0, 500) + "..."; // Truncate
            result = { title, summary, url: action.parameters.url };
          } catch (error) {
            result = { error: "Failed to scan web page" };
          }
        }
        break;
      case "deploy_app":
        result = { status: "deployed", url: "https://example.com" };
        break;
      case "blockchain_experiment":
        // Sandboxed mock
        result = {
          txHash: "0x" + Math.random().toString(16).substr(2, 64),
          status: "confirmed",
        };
        break;
      default:
        result = { status: "unknown_action" };
    }

    // Audit log
    this.auditLogs.push({
      id: crypto.randomUUID(),
      userId,
      action: action.type,
      timestamp: Date.now(),
      details: action.parameters,
      riskLevel: action.riskLevel,
    });

    this.logger.info(
      { actionId: action.id, userId },
      "Action executed successfully",
    );

    return result;
  }

  getAuditLogs(userId?: string): AuditLog[] {
    return userId
      ? this.auditLogs.filter((log) => log.userId === userId)
      : this.auditLogs;
  }
}
