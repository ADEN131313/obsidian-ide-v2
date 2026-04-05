import OpenAI from "openai";
import { ToolRegistry, Tool, ToolResult } from "./tools/registry.js";
import type { AgentConfig, AgentMessage, AgentContext } from "./index.js";
import { SecurityManager } from "./tools/security.js";

/**
 * Agent Orchestration System
 * Manages the agent execution loop, tool calling, and multi-step workflows
 */

export interface AgentOrchestratorConfig {
  maxIterations: number;
  enableStreaming: boolean;
  timeout: number;
  allowMultiStepPlanning: boolean;
}

export interface AgentResponse {
  message: string;
  toolCalls: Array<{
    toolName: string;
    parameters: unknown;
    result: ToolResult;
  }>;
  iterations: number;
  completed: boolean;
  error?: string;
}

export interface ExecutionPlan {
  steps: Array<{
    id: string;
    description: string;
    toolName: string;
    parameters: unknown;
    dependsOn?: string[];
  }>;
  estimatedDuration: number;
}

export class AgentOrchestrator {
  private openai: OpenAI;
  private toolRegistry: ToolRegistry;
  private securityManager: SecurityManager;
  private config: AgentOrchestratorConfig;
  private context: AgentContext;
  private conversationHistory: AgentMessage[] = [];

  constructor(
    apiKey: string,
    toolRegistry: ToolRegistry,
    securityManager: SecurityManager,
    config: Partial<AgentOrchestratorConfig> = {},
    context: AgentContext
  ) {
    this.openai = new OpenAI({ apiKey });
    this.toolRegistry = toolRegistry;
    this.securityManager = securityManager;
    this.config = {
      maxIterations: config.maxIterations ?? 10,
      enableStreaming: config.enableStreaming ?? false,
      timeout: config.timeout ?? 30000,
      allowMultiStepPlanning: config.allowMultiStepPlanning ?? true,
    };
    this.context = context;
  }

  /**
   * Main execution loop - processes user input and executes tools as needed
   */
  async execute(userMessage: string, agentConfig: AgentConfig): Promise<AgentResponse> {
    const startTime = Date.now();
    const toolCalls: AgentResponse["toolCalls"] = [];
    let iterations = 0;

    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      while (iterations < this.config.maxIterations) {
        iterations++;

        // Get response from OpenAI with tool definitions
        const completion = await this.openai.chat.completions.create({
          model: agentConfig.model,
          temperature: agentConfig.temperature,
          max_tokens: agentConfig.maxTokens,
          messages: [
            { role: "system", content: this.buildSystemPrompt(agentConfig) } as any,
            ...this.conversationHistory.map(m => ({
              role: m.role === "tool" ? "assistant" : m.role,
              content: m.content,
              name: m.name,
              tool_calls: m.tool_calls,
              tool_call_id: m.tool_call_id,
            } as any)),
          ],
          tools: this.toolRegistry.getOpenAITools(),
          tool_choice: "auto",
        });

        const assistantMessage = completion.choices[0].message;

        // Add assistant message to history
        this.conversationHistory.push({
          role: "assistant",
          content: assistantMessage.content || "",
          tool_calls: assistantMessage.tool_calls as any,
        });

        // If no tool calls, we're done
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          return {
            message: assistantMessage.content || "",
            toolCalls,
            iterations,
            completed: true,
          };
        }

        // Execute tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          
          // Security check
          if (!this.securityManager.isToolAllowed(toolName)) {
            const deniedResult: ToolResult = {
              toolCallId: toolCall.id,
              role: "tool",
              content: JSON.stringify({ error: `Tool ${toolName} is not permitted` }),
            };
            
            toolCalls.push({
              toolName,
              parameters: {},
              result: deniedResult,
            });
            
            this.conversationHistory.push({
              role: "tool",
              content: deniedResult.content,
              tool_call_id: toolCall.id,
            });
            
            continue;
          }

          // Execute the tool
          const toolStartTime = Date.now();
          const result = await this.toolRegistry.executeToolCall({
            id: toolCall.id,
            type: "function",
            function: {
              name: toolName,
              arguments: toolCall.function.arguments,
            },
          });

          // Log to audit
          this.securityManager.log({
            id: toolCall.id,
            timestamp: new Date(),
            userId: this.context.userId,
            conversationId: this.context.conversationId,
            action: "tool_execution",
            toolName,
            parameters: JSON.parse(toolCall.function.arguments),
            result: result.content.includes("error") ? "failure" : "success",
            error: result.content.includes("error") ? result.content : undefined,
            duration: Date.now() - toolStartTime,
          });

          toolCalls.push({
            toolName,
            parameters: JSON.parse(toolCall.function.arguments),
            result,
          });

          // Add tool result to history
          this.conversationHistory.push({
            role: "tool",
            content: result.content,
            tool_call_id: toolCall.id,
          });
        }

        // Check timeout
        if (Date.now() - startTime > this.config.timeout) {
          return {
            message: "Execution timed out",
            toolCalls,
            iterations,
            completed: false,
            error: "Timeout",
          };
        }
      }

      return {
        message: "Maximum iterations reached",
        toolCalls,
        iterations,
        completed: false,
        error: "Max iterations",
      };
    } catch (error) {
      return {
        message: "",
        toolCalls,
        iterations,
        completed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a multi-step execution plan for complex tasks
   */
  async createPlan(task: string): Promise<ExecutionPlan> {
    if (!this.config.allowMultiStepPlanning) {
      return {
        steps: [],
        estimatedDuration: 0,
      };
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a planning assistant. Break down the given task into specific steps that can be executed with tools.
Available tools: ${this.toolRegistry.list().map(t => t.name).join(", ")}

Respond with a JSON object containing:
{
  "steps": [
    {
      "id": "step-1",
      "description": "What this step does",
      "toolName": "name_of_tool",
      "parameters": {},
      "dependsOn": ["step-0"] // optional
    }
  ],
  "estimatedDuration": 30 // in seconds
}`,
        },
        { role: "user", content: task },
      ],
    });

    try {
      const plan = JSON.parse(completion.choices[0].message.content || "{}");
      return plan as ExecutionPlan;
    } catch {
      return {
        steps: [],
        estimatedDuration: 0,
      };
    }
  }

  /**
   * Execute a pre-created plan
   */
  async executePlan(plan: ExecutionPlan): Promise<AgentResponse> {
    const toolCalls: AgentResponse["toolCalls"] = [];
    let iterations = 0;

    for (const step of plan.steps) {
      iterations++;

      // Check dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        const allDepsCompleted = step.dependsOn.every(depId => {
          const depStep = plan.steps.find(s => s.id === depId);
          return depStep !== undefined; // In real implementation, track step completion
        });
        
        if (!allDepsCompleted) {
          continue;
        }
      }

      // Execute the step
      const toolCall = {
        id: `step-${step.id}`,
        type: "function" as const,
        function: {
          name: step.toolName,
          arguments: JSON.stringify(step.parameters),
        },
      };

      const result = await this.toolRegistry.executeToolCall(toolCall);

      toolCalls.push({
        toolName: step.toolName,
        parameters: step.parameters,
        result,
      });
    }

    return {
      message: "Plan executed",
      toolCalls,
      iterations,
      completed: true,
    };
  }

  /**
   * Stream responses for real-time updates
   */
  async *executeStreaming(
    userMessage: string,
    agentConfig: AgentConfig
  ): AsyncGenerator<{ type: "message" | "tool_start" | "tool_end" | "complete" | "error"; data: unknown }> {
    if (!this.config.enableStreaming) {
      yield { type: "error", data: "Streaming not enabled" };
      return;
    }

    // Implementation would use OpenAI's streaming API
    // This is a placeholder structure
    yield { type: "message", data: { content: "Processing..." } };
    
    // ... streaming implementation
    
    yield { type: "complete", data: { message: "Done" } };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): AgentMessage[] {
    return [...this.conversationHistory];
  }

  private buildSystemPrompt(config: AgentConfig): string {
    const basePrompt = `You are the OBSIDIAN AI Agent, an intelligent assistant integrated into the OBSIDIAN IDE.
You have access to various tools to help users with their development tasks.

Context:
- User ID: ${this.context.userId}
- Working Directory: ${this.context.workingDirectory}
- Session ID: ${this.context.sessionId}

Guidelines:
1. Use tools when necessary to accomplish tasks
2. Be precise and efficient
3. Report errors clearly
4. Ask for clarification if the request is ambiguous

${config.systemPrompt || ""}`;

    return basePrompt;
  }
}
