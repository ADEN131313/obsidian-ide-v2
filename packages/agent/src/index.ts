import type { ToolCall as TC } from "./tools/registry.js";

export type { Tool, ToolResult } from "./tools/registry.js";
export { ToolRegistry } from "./tools/registry.js";
export { createFileSystemTools } from "./tools/filesystem.js";
export { createCodeExecutionTools } from "./tools/code.js";
export { createEditorTools, type EditorOperations } from "./tools/editor.js";
export { createTerminalTools } from "./tools/terminal.js";
export { createGitTools } from "./tools/git.js";
export { createDatabaseTools, type DatabaseOperations } from "./tools/database.js";
export { createSecurityTools, SecurityManager, type SecurityPolicy, type Permission, type AuditLogEntry } from "./tools/security.js";
export { AgentOrchestrator, type AgentOrchestratorConfig, type AgentResponse, type ExecutionPlan } from "./orchestrator.js";

export type ToolCall = TC;

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  enableStreaming?: boolean;
  maxIterations?: number;
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
  permissions?: string[];
}
