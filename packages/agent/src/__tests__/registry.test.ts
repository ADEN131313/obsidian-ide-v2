import { describe, it, expect } from "vitest";
import { ToolRegistry } from "../tools/registry";

describe("ToolRegistry", () => {
  it("should register a tool", () => {
    const registry = new ToolRegistry();
    registry.registerTool("test_tool", {
      description: "Test tool",
      parameters: { type: "object", properties: {} },
      execute: async () => ({ success: true }),
    });
    
    const tools = registry.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe("test_tool");
  });

  it("should execute a registered tool", async () => {
    const registry = new ToolRegistry();
    registry.registerTool("echo", {
      description: "Echo tool",
      parameters: { 
        type: "object", 
        properties: { message: { type: "string" } }
      },
      execute: async (args: { message: string }) => ({ result: args.message }),
    });
    
    const result = await registry.executeTool("echo", { message: "hello" });
    expect(result).toEqual({ result: "hello" });
  });
});
