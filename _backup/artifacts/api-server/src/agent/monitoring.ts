import type { AgentLogger } from "./types.ts";

export class MonitoringSubsystem {
  private readonly logger: Required<AgentLogger>;
  private metrics = {
    interactions: 0,
    actionsExecuted: 0,
    errors: 0,
    consentsGranted: 0,
  };

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
  }

  recordInteraction(): void {
    this.metrics.interactions++;
  }

  recordActionExecution(): void {
    this.metrics.actionsExecuted++;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  recordConsentGranted(): void {
    this.metrics.consentsGranted++;
  }

  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  generateReport(): string {
    return `Metrics Report:
- Total Interactions: ${this.metrics.interactions}
- Actions Executed: ${this.metrics.actionsExecuted}
- Errors: ${this.metrics.errors}
- Consents Granted: ${this.metrics.consentsGranted}`;
  }
}
