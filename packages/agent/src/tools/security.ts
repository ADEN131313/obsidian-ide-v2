import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * Security and Audit tools for the AI agent
 * Provides sandboxing, permission controls, and audit logging
 */

// Audit log entry type
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  conversationId: string;
  action: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result: "success" | "failure";
  error?: string;
  duration: number;
  ipAddress?: string;
}

// Permission types
export type Permission = 
  | "filesystem:read"
  | "filesystem:write"
  | "filesystem:delete"
  | "terminal:execute"
  | "git:read"
  | "git:write"
  | "db:read"
  | "db:write"
  | "editor:modify"
  | "network:external";

export interface SecurityPolicy {
  allowedTools: string[];
  deniedTools: string[];
  allowedPaths: string[];
  deniedPaths: string[];
  maxExecutionTime: number;
  maxFileSize: number;
  allowNetworkAccess: boolean;
  permissions: Permission[];
}

const CheckPermissionSchema = z.object({
  toolName: z.string().describe("Tool name to check permission for"),
  parameters: z.record(z.unknown()).optional().describe("Tool parameters"),
});

const ValidatePathSchema = z.object({
  path: z.string().describe("Path to validate"),
  operation: z.enum(["read", "write", "delete"]).describe("Intended operation"),
});

const AuditActionSchema = z.object({
  action: z.string().describe("Action being audited"),
  toolName: z.string().describe("Tool name"),
  parameters: z.record(z.unknown()).describe("Tool parameters"),
  result: z.enum(["success", "failure"]).describe("Action result"),
  error: z.string().optional().describe("Error message if failed"),
  duration: z.number().describe("Execution duration in ms"),
});

const SanitizeInputSchema = z.object({
  input: z.string().describe("Input to sanitize"),
  type: z.enum(["command", "sql", "path", "general"]).describe("Type of sanitization needed"),
});

export class SecurityManager {
  private auditLog: AuditLogEntry[] = [];
  private policy: SecurityPolicy;

  constructor(policy: SecurityPolicy) {
    this.policy = policy;
  }

  hasPermission(permission: Permission): boolean {
    return this.policy.permissions.includes(permission);
  }

  isToolAllowed(toolName: string): boolean {
    // Check if explicitly denied
    if (this.policy.deniedTools.includes(toolName)) {
      return false;
    }
    // Check if explicitly allowed (or allow all if empty)
    if (this.policy.allowedTools.length > 0) {
      return this.policy.allowedTools.includes(toolName);
    }
    return true;
  }

  isPathAllowed(filePath: string, operation: "read" | "write" | "delete"): boolean {
    // Check denied paths first
    for (const deniedPath of this.policy.deniedPaths) {
      if (filePath.startsWith(deniedPath)) {
        return false;
      }
    }

    // Check allowed paths
    if (this.policy.allowedPaths.length > 0) {
      for (const allowedPath of this.policy.allowedPaths) {
        if (filePath.startsWith(allowedPath)) {
          return true;
        }
      }
      return false;
    }

    // Default: check operation-specific permission
    switch (operation) {
      case "read":
        return this.hasPermission("filesystem:read");
      case "write":
        return this.hasPermission("filesystem:write");
      case "delete":
        return this.hasPermission("filesystem:delete");
      default:
        return false;
    }
  }

  log(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    // In production, persist to database or external logging service
  }

  getAuditLog(filters?: { userId?: string; toolName?: string; startDate?: Date; endDate?: Date }): AuditLogEntry[] {
    let filtered = this.auditLog;
    
    if (filters?.userId) {
      filtered = filtered.filter(e => e.userId === filters.userId);
    }
    if (filters?.toolName) {
      filtered = filtered.filter(e => e.toolName === filters.toolName);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
    }
    
    return filtered;
  }

  sanitizeInput(input: string, type: "command" | "sql" | "path" | "general"): string {
    switch (type) {
      case "command":
        // Remove dangerous shell characters
        return input.replace(/[;&|`$(){}[\]\\]/g, "");
      case "sql":
        // Basic SQL injection prevention (use parameterized queries in production)
        return input.replace(/['";]/g, "");
      case "path":
        // Prevent path traversal
        return input.replace(/\.\.\//g, "").replace(/\.\\/g, "");
      case "general":
        // General sanitization
        return input.replace(/[<>]/g, "");
      default:
        return input;
    }
  }
}

export function createSecurityTools(
  securityManager: SecurityManager
): Tool[] {
  return [
    {
      name: "security_check_permission",
      description: "Check if a tool operation is permitted",
      parameters: CheckPermissionSchema,
      execute: async (args: unknown) => {
        const { toolName, parameters = {} } = CheckPermissionSchema.parse(args);
        
        const allowed = securityManager.isToolAllowed(toolName);
        
        // Check path if filesystem operation
        let pathAllowed = true;
        if (parameters.path && typeof parameters.path === "string") {
          const operation = toolName.includes("write") || toolName.includes("delete") ? "write" : "read";
          pathAllowed = securityManager.isPathAllowed(parameters.path, operation);
        }
        
        return {
          success: allowed && pathAllowed,
          toolName,
          allowed,
          pathAllowed,
          policy: {
            allowedTools: securityManager["policy"].allowedTools,
            deniedTools: securityManager["policy"].deniedTools,
          },
        };
      },
    },
    {
      name: "security_validate_path",
      description: "Validate if a file path is allowed for an operation",
      parameters: ValidatePathSchema,
      execute: async (args: unknown) => {
        const { path, operation } = ValidatePathSchema.parse(args);
        
        const allowed = securityManager.isPathAllowed(path, operation);
        
        return {
          success: true,
          path,
          operation,
          allowed,
          sanitized: securityManager.sanitizeInput(path, "path"),
        };
      },
    },
    {
      name: "security_sanitize_input",
      description: "Sanitize user input to prevent injection attacks",
      parameters: SanitizeInputSchema,
      execute: async (args: unknown) => {
        const { input, type } = SanitizeInputSchema.parse(args);
        
        const sanitized = securityManager.sanitizeInput(input, type);
        
        return {
          success: true,
          original: input,
          sanitized,
          type,
          wasModified: input !== sanitized,
        };
      },
    },
    {
      name: "security_audit_log",
      description: "View the security audit log",
      parameters: z.object({
        userId: z.string().optional().describe("Filter by user ID"),
        toolName: z.string().optional().describe("Filter by tool name"),
        limit: z.number().default(100).describe("Maximum entries to return"),
      }),
      execute: async (args: unknown) => {
        const { userId, toolName, limit } = z.object({
          userId: z.string().optional(),
          toolName: z.string().optional(),
          limit: z.number().default(100),
        }).parse(args);
        
        const log = securityManager.getAuditLog({ userId, toolName });
        
        return {
          success: true,
          entries: log.slice(-limit),
          totalCount: log.length,
          filters: { userId, toolName },
        };
      },
    },
  ];
}
