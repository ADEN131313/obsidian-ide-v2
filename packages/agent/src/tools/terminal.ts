import { z } from "zod";
import type { Tool } from "./registry.js";
import { spawn } from "child_process";
import { promisify } from "util";

/**
 * Terminal/Command execution tools for the AI agent
 * Allows the agent to run shell commands, npm scripts, and git operations
 */

const RunCommandSchema = z.object({
  command: z.string().describe("Command to execute"),
  args: z.array(z.string()).optional().describe("Command arguments"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  env: z.record(z.string()).optional().describe("Environment variables"),
});

const RunNpmScriptSchema = z.object({
  script: z.string().describe("NPM script name to run"),
  packageManager: z.enum(["npm", "pnpm", "yarn"]).default("pnpm"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().default(60000).describe("Timeout in milliseconds"),
});

const RunTestsSchema = z.object({
  filter: z.string().optional().describe("Test filter pattern"),
  watch: z.boolean().default(false).describe("Run in watch mode"),
  coverage: z.boolean().default(false).describe("Generate coverage report"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().default(120000).describe("Timeout in milliseconds"),
});

const InstallDependenciesSchema = z.object({
  packages: z.array(z.string()).optional().describe("Specific packages to install"),
  dev: z.boolean().default(false).describe("Install as dev dependencies"),
  packageManager: z.enum(["npm", "pnpm", "yarn"]).default("pnpm"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().default(120000).describe("Timeout in milliseconds"),
});

const BuildProjectSchema = z.object({
  target: z.string().optional().describe("Specific build target (e.g., 'web', 'api')"),
  cwd: z.string().optional().describe("Working directory"),
  timeout: z.number().default(300000).describe("Timeout in milliseconds"),
});

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

async function runCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number; env?: Record<string, string> } = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const { cwd, timeout = 30000, env } = options;
    
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timeoutId = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }, timeout);

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
        success: code === 0 && !killed,
      });
    });

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: "",
        stderr: error.message,
        exitCode: -1,
        success: false,
      });
    });
  });
}

export function createTerminalTools(): Tool[] {
  return [
    {
      name: "terminal_run_command",
      description: "Execute a shell command with arguments",
      parameters: RunCommandSchema,
      execute: async (args: unknown) => {
        const { command, args: cmdArgs = [], cwd, timeout, env } = RunCommandSchema.parse(args);
        
        const result = await runCommand(command, cmdArgs, { cwd, timeout, env });
        
        return {
          success: result.success,
          command: `${command} ${cmdArgs.join(" ")}`,
          cwd: cwd || process.cwd(),
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          truncated: result.stdout.length > 10000 || result.stderr.length > 10000,
        };
      },
    },
    {
      name: "terminal_run_npm_script",
      description: "Run an NPM/PNPM/Yarn script from package.json",
      parameters: RunNpmScriptSchema,
      execute: async (args: unknown) => {
        const { script, packageManager, cwd, timeout } = RunNpmScriptSchema.parse(args);
        
        const result = await runCommand(packageManager, ["run", script], { cwd, timeout });
        
        return {
          success: result.success,
          packageManager,
          script,
          cwd: cwd || process.cwd(),
          exitCode: result.exitCode,
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "terminal_run_tests",
      description: "Run the test suite with optional filtering",
      parameters: RunTestsSchema,
      execute: async (args: unknown) => {
        const { filter, watch, coverage, cwd, timeout } = RunTestsSchema.parse(args);
        
        const args_array = ["test"];
        if (filter) args_array.push(filter);
        if (watch) args_array.push("--watch");
        if (coverage) args_array.push("--coverage");
        
        const result = await runCommand("pnpm", args_array, { cwd, timeout });
        
        return {
          success: result.success,
          filter: filter || "all",
          watch,
          coverage,
          cwd: cwd || process.cwd(),
          exitCode: result.exitCode,
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "terminal_install_dependencies",
      description: "Install project dependencies or specific packages",
      parameters: InstallDependenciesSchema,
      execute: async (args: unknown) => {
        const { packages, dev, packageManager, cwd, timeout } = InstallDependenciesSchema.parse(args);
        
        const args_array = packages ? ["add"] : ["install"];
        if (packages) {
          args_array.push(...packages);
          if (dev) args_array.push("--save-dev");
        }
        
        const result = await runCommand(packageManager, args_array, { cwd, timeout });
        
        return {
          success: result.success,
          packageManager,
          packages: packages || "all",
          dev,
          cwd: cwd || process.cwd(),
          exitCode: result.exitCode,
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "terminal_build_project",
      description: "Build the project using the build script",
      parameters: BuildProjectSchema,
      execute: async (args: unknown) => {
        const { target, cwd, timeout } = BuildProjectSchema.parse(args);
        
        const buildCmd = target ? ["--filter", `@obsidian/${target}`, "build"] : ["build"];
        const result = await runCommand("pnpm", buildCmd, { cwd, timeout });
        
        return {
          success: result.success,
          target: target || "all",
          cwd: cwd || process.cwd(),
          exitCode: result.exitCode,
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
  ];
}
