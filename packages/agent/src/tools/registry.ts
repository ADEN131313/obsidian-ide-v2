import OpenAI from "openai";
import { z } from "zod";

/**
 * Tool registry for dynamic tool discovery and execution
 */
export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (args: unknown) => Promise<unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  role: "tool";
  content: string;
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return this.list().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.parameters),
      },
    }));
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const tool = this.get(toolCall.function.name);
    if (!tool) {
      return {
        toolCallId: toolCall.id,
        role: "tool",
        content: JSON.stringify({ error: `Tool ${toolCall.function.name} not found` }),
      };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const validated = tool.parameters.parse(args);
      const result = await tool.execute(validated);
      return {
        toolCallId: toolCall.id,
        role: "tool",
        content: JSON.stringify(result),
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        role: "tool",
        content: JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }
}

// Simple Zod to JSON Schema converter
function zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
  // This is a simplified converter - in production, use zod-to-json-schema package
  const def = schema._def as any;
  
  if (def.typeName === "ZodObject") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(def.shape())) {
      const zodValue = value as z.ZodSchema;
      properties[key] = zodToJsonSchema(zodValue);
      if (!(zodValue instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    
    return { type: "object", properties, required };
  }
  
  if (def.typeName === "ZodString") return { type: "string" };
  if (def.typeName === "ZodNumber") return { type: "number" };
  if (def.typeName === "ZodBoolean") return { type: "boolean" };
  if (def.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodToJsonSchema(def.type as z.ZodSchema),
    };
  }
  if (def.typeName === "ZodOptional") {
    return zodToJsonSchema(def.innerType);
  }
  
  return { type: "object" };
}
