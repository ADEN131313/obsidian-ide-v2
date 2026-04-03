export type AgentRole = "system" | "user" | "assistant";
export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type AgentMessage = {
  role: AgentRole;
  content: string;
};

export type ChatRequestBody = {
  message: unknown;
  history?: unknown;
  model?: unknown;
  maxCompletionTokens?: unknown;
};

export type AgentLogger = {
  debug?: (payload: Record<string, unknown>, message?: string) => void;
  info?: (payload: Record<string, unknown>, message?: string) => void;
  warn?: (payload: Record<string, unknown>, message?: string) => void;
  error?: (payload: Record<string, unknown>, message?: string) => void;
};

export type ConsentRecord = {
  userId: string;
  purpose: string;
  granted: boolean;
  timestamp: number;
  expiresAt?: number;
};

export type AuditLog = {
  id: string;
  userId: string;
  action: string;
  timestamp: number;
  details: Record<string, unknown>;
  riskLevel: "low" | "medium" | "high";
};

export type Goal = {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  subtasks: Goal[];
};

export type Action = {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
  requiresConsent: boolean;
  riskLevel: "low" | "medium" | "high";
};

export type KnowledgeEntry = {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  tags: string[];
};

export type InterfaceChannel = "text" | "voice" | "api";

export type InteractionRequest = {
  channel: InterfaceChannel;
  userId: string;
  content: string;
  metadata: Record<string, unknown>;
};
