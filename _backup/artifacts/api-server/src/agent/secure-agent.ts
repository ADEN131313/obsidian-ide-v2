import type {
  InteractionRequest,
  Goal,
  Action,
  AgentLogger,
  InterfaceChannel,
} from "./types.ts";
import { PlanningSubsystem } from "./planning.ts";
import { ActionExecutionSubsystem } from "./action-execution.ts";
import { KnowledgeManagementSubsystem } from "./knowledge-management.ts";
import { SecuritySubsystem } from "./security.ts";
import { MonitoringSubsystem } from "./monitoring.ts";

export class SecureAgent {
  private readonly planning: PlanningSubsystem;
  private readonly execution: ActionExecutionSubsystem;
  private readonly knowledge: KnowledgeManagementSubsystem;
  private readonly security: SecuritySubsystem;
  private readonly monitoring: MonitoringSubsystem;
  private readonly logger: Required<AgentLogger>;

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
    this.planning = new PlanningSubsystem(this.logger);
    this.execution = new ActionExecutionSubsystem(this.logger);
    this.knowledge = new KnowledgeManagementSubsystem(this.logger);
    this.security = new SecuritySubsystem(this.logger);
    this.monitoring = new MonitoringSubsystem(this.logger);
  }

  async handleVoiceInteraction(
    audioData: Buffer,
    userId: string,
  ): Promise<string> {
    // Mock voice transcription
    const transcribedText = "Mock transcribed text from audio"; // In real impl, use speech-to-text API
    const request: InteractionRequest = {
      channel: "voice",
      userId,
      content: transcribedText,
      metadata: {},
    };
    return this.handleInteraction(request);
  }

  async handleApiInteraction(
    apiRequest: Record<string, unknown>,
    userId: string,
  ): Promise<Record<string, unknown>> {
    // Mock API handling
    const content = JSON.stringify(apiRequest);
    const request: InteractionRequest = {
      channel: "api",
      userId,
      content,
      metadata: apiRequest,
    };
    const response = await this.handleInteraction(request);
    return { response, status: "success" };
  }

  async handleInteraction(request: InteractionRequest): Promise<string> {
    this.monitoring.recordInteraction();

    // Security checks
    if (!this.security.checkRateLimit(request.userId)) {
      this.monitoring.recordError();
      return "Rate limit exceeded. Please try again later.";
    }

    const validation = this.security.validateRequest(request.content);
    if (!validation.valid) {
      this.monitoring.recordError();
      return `Request rejected: ${validation.reason}. Please rephrase your request safely.`;
    }

    const sanitizedContent = this.security.sanitizeInput(request.content);

    try {
      // Reason about intent
      const goal = await this.planning.reasonAboutIntent(
        sanitizedContent,
        request.metadata,
      );

      // Execute actions based on goal
      const responseParts: string[] = [];

      for (const subtask of goal.subtasks) {
        const action = this.createActionFromSubtask(subtask, request.userId);
        if (action) {
          try {
            const result = await this.execution.executeAction(
              action,
              request.userId,
            );
            this.monitoring.recordActionExecution();
            responseParts.push(
              `Completed: ${subtask.description} - ${JSON.stringify(result)}`,
            );

            // Store knowledge
            await this.knowledge.storeKnowledge(
              JSON.stringify(result),
              "agent_execution",
              ["action", action.type],
            );
          } catch (error) {
            this.monitoring.recordError();
            responseParts.push(
              `Failed: ${subtask.description} - ${error.message}`,
            );
          }
        }
      }

      // Learn and adapt: store interaction
      await this.knowledge.storeKnowledge(
        `User: ${sanitizedContent}\nResponse: ${responseParts.join("\n")}`,
        "interaction_log",
        ["interaction", request.channel],
      );

      return responseParts.join("\n") || "Goal processed successfully.";
    } catch (error) {
      this.monitoring.recordError();
      return `An error occurred: ${error.message}`;
    }
  }

  private createActionFromSubtask(
    subtask: Goal,
    userId: string,
  ): Action | null {
    if (subtask.description.includes("web")) {
      return {
        id: crypto.randomUUID(),
        type: "web_scan",
        parameters: { url: "https://example.com" }, // Mock
        requiresConsent: true,
        riskLevel: "medium",
      };
    }
    if (subtask.description.includes("deploy")) {
      return {
        id: crypto.randomUUID(),
        type: "deploy_app",
        parameters: {},
        requiresConsent: true,
        riskLevel: "medium",
      };
    }
    if (subtask.description.includes("blockchain")) {
      return {
        id: crypto.randomUUID(),
        type: "blockchain_experiment",
        parameters: {},
        requiresConsent: true,
        riskLevel: "high",
      };
    }
    return null;
  }

  async grantConsent(
    userId: string,
    purpose: string,
    durationMs?: number,
  ): Promise<void> {
    await this.execution.grantConsent(userId, purpose, durationMs);
  }

  getAuditLogs(userId?: string) {
    return this.execution.getAuditLogs(userId);
  }

  getKnowledge() {
    return this.knowledge.getAllKnowledge();
  }

  getMetrics() {
    return this.monitoring.getMetrics();
  }

  generateMonitoringReport() {
    return this.monitoring.generateReport();
  }
}
