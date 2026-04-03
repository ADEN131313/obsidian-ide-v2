import type { Goal, AgentLogger } from "./types.ts";

export class PlanningSubsystem {
  private readonly logger: Required<AgentLogger>;

  constructor(logger?: AgentLogger) {
    this.logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      ...logger,
    };
  }

  async reasonAboutIntent(
    request: string,
    context: Record<string, unknown>,
  ): Promise<Goal> {
    // Basic reasoning: parse request to create goals
    const goal: Goal = {
      id: crypto.randomUUID(),
      description: `Handle request: ${request}`,
      status: "pending",
      subtasks: [],
    };

    // Simple logic: if request mentions "web", add web scanning subtask
    if (
      request.toLowerCase().includes("web") ||
      request.toLowerCase().includes("search")
    ) {
      goal.subtasks.push({
        id: crypto.randomUUID(),
        description: "Scan web for information with consent",
        status: "pending",
        subtasks: [],
      });
    }

    // If mentions "deploy", add deployment subtask
    if (
      request.toLowerCase().includes("deploy") ||
      request.toLowerCase().includes("build")
    ) {
      goal.subtasks.push({
        id: crypto.randomUUID(),
        description: "Design and deploy application",
        status: "pending",
        subtasks: [],
      });
    }

    this.logger.info({ goalId: goal.id }, "Generated goal from user intent");

    return goal;
  }

  async refineGoal(goal: Goal, feedback: string): Promise<Goal> {
    // Simple refinement: add feedback as subtask
    goal.subtasks.push({
      id: crypto.randomUUID(),
      description: `Incorporate feedback: ${feedback}`,
      status: "pending",
      subtasks: [],
    });

    this.logger.info({ goalId: goal.id }, "Refined goal with user feedback");

    return goal;
  }
}
