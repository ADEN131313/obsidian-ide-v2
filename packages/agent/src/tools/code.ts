import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * Code execution tools for the AI agent
 */

const ExecuteCodeSchema = z.object({
  code: z.string().describe("OBSIDIAN code to execute"),
  timeout: z.number().optional().describe("Timeout in milliseconds (default: 5000)"),
});

const AnalyzeCodeSchema = z.object({
  code: z.string().describe("Code to analyze"),
  type: z.enum(["lint", "complexity", "security"]).describe("Type of analysis"),
});

export function createCodeExecutionTools(
  executeObsidian: (code: string) => Promise<{ output: string; error?: string }>
): Tool[] {
  return [
    {
      name: "execute_obsidian",
      description: "Execute OBSIDIAN code and return the output",
      parameters: ExecuteCodeSchema,
      execute: async (args: unknown) => {
        const { code, timeout = 5000 } = ExecuteCodeSchema.parse(args);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Execution timeout")), timeout);
        });
        
        try {
          const result = await Promise.race([executeObsidian(code), timeoutPromise]);
          return {
            success: !result.error,
            output: result.output,
            error: result.error,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Execution failed",
          };
        }
      },
    },
    {
      name: "analyze_code",
      description: "Analyze code for issues, complexity, or security problems",
      parameters: AnalyzeCodeSchema,
      execute: async (args: unknown) => {
        const { code, type } = AnalyzeCodeSchema.parse(args);
        
        // Placeholder - integrate with actual analysis tools
        const analysis = {
          type,
          issues: [] as string[],
          metrics: {
            lines: code.split("\n").length,
            complexity: estimateComplexity(code),
          },
        };
        
        return analysis;
      },
    },
  ];
}

function estimateComplexity(code: string): number {
  // Simple cyclomatic complexity estimation
  let complexity = 1;
  const branches = ["if", "while", "for", "case", "&&", "||", "?"];
  for (const branch of branches) {
    const regex = new RegExp(branch, "g");
    const matches = code.match(regex);
    if (matches) {
      complexity += matches.length;
    }
  }
  return complexity;
}
