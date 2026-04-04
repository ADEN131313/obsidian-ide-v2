import type { ToolCall as TC } from "./tools/registry.js";

export type { Tool, ToolResult } from "./tools/registry.js";
export { ToolRegistry } from "./tools/registry.js";
export { createFileSystemTools } from "./tools/filesystem.js";
export { createCodeExecutionTools } from "./tools/code.js";

export type ToolCall = TC;

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface AgentContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  workingDirectory: string;
  memory: Map<string, unknown>;
}
