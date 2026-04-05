import { z } from "zod";
import type { Tool } from "./registry.js";
import { spawn } from "child_process";

/**
 * Git integration tools for the AI agent
 * Allows the agent to perform git operations
 */

const GitStatusSchema = z.object({
  cwd: z.string().optional().describe("Working directory"),
});

const GitAddSchema = z.object({
  files: z.array(z.string()).describe("Files to stage"),
  all: z.boolean().default(false).describe("Stage all changes"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitCommitSchema = z.object({
  message: z.string().describe("Commit message"),
  amend: z.boolean().default(false).describe("Amend previous commit"),
  noVerify: z.boolean().default(false).describe("Skip pre-commit hooks"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitPushSchema = z.object({
  remote: z.string().default("origin").describe("Remote name"),
  branch: z.string().optional().describe("Branch name (defaults to current)"),
  force: z.boolean().default(false).describe("Force push"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitPullSchema = z.object({
  remote: z.string().default("origin").describe("Remote name"),
  branch: z.string().optional().describe("Branch name"),
  rebase: z.boolean().default(false).describe("Rebase instead of merge"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitBranchSchema = z.object({
  action: z.enum(["list", "create", "delete", "switch"]).describe("Branch action"),
  name: z.string().optional().describe("Branch name (for create/delete/switch)"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitDiffSchema = z.object({
  staged: z.boolean().default(false).describe("Show staged changes"),
  file: z.string().optional().describe("Specific file to diff"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitLogSchema = z.object({
  maxCount: z.number().default(10).describe("Maximum number of commits"),
  file: z.string().optional().describe("Show history for specific file"),
  author: z.string().optional().describe("Filter by author"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitCheckoutSchema = z.object({
  target: z.string().describe("Branch name, commit hash, or file path"),
  create: z.boolean().default(false).describe("Create new branch"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitCloneSchema = z.object({
  url: z.string().describe("Repository URL"),
  directory: z.string().optional().describe("Target directory"),
  depth: z.number().optional().describe("Clone depth (shallow clone)"),
  cwd: z.string().optional().describe("Working directory"),
});

const GitStashSchema = z.object({
  action: z.enum(["push", "pop", "list", "drop", "clear"]).default("push").describe("Stash action"),
  message: z.string().optional().describe("Stash message (for push)"),
  cwd: z.string().optional().describe("Working directory"),
});

async function runGitCommand(
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number; success: boolean }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: cwd || process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
        success: code === 0,
      });
    });

    child.on("error", (error) => {
      resolve({
        stdout: "",
        stderr: error.message,
        exitCode: -1,
        success: false,
      });
    });
  });
}

export function createGitTools(): Tool[] {
  return [
    {
      name: "git_status",
      description: "Show working tree status",
      parameters: GitStatusSchema,
      execute: async (args: unknown) => {
        const { cwd } = GitStatusSchema.parse(args);
        const result = await runGitCommand(["status", "--porcelain", "-b"], cwd);
        
        return {
          success: result.success,
          cwd: cwd || process.cwd(),
          status: result.stdout,
          hasChanges: result.stdout.length > 0,
        };
      },
    },
    {
      name: "git_add",
      description: "Add file contents to the index (stage files)",
      parameters: GitAddSchema,
      execute: async (args: unknown) => {
        const { files, all, cwd } = GitAddSchema.parse(args);
        
        const gitArgs = all ? ["add", "."] : ["add", ...files];
        const result = await runGitCommand(gitArgs, cwd);
        
        return {
          success: result.success,
          staged: all ? "all files" : files,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_commit",
      description: "Record changes to the repository",
      parameters: GitCommitSchema,
      execute: async (args: unknown) => {
        const { message, amend, noVerify, cwd } = GitCommitSchema.parse(args);
        
        const args_array = ["commit", "-m", message];
        if (amend) args_array.push("--amend");
        if (noVerify) args_array.push("--no-verify");
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          message,
          amend,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_push",
      description: "Update remote refs along with associated objects",
      parameters: GitPushSchema,
      execute: async (args: unknown) => {
        const { remote, branch, force, cwd } = GitPushSchema.parse(args);
        
        const args_array = ["push", remote];
        if (branch) args_array.push(branch);
        if (force) args_array.push("--force");
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          remote,
          branch: branch || "current",
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_pull",
      description: "Fetch from and integrate with another repository or local branch",
      parameters: GitPullSchema,
      execute: async (args: unknown) => {
        const { remote, branch, rebase, cwd } = GitPullSchema.parse(args);
        
        const args_array = ["pull", remote];
        if (branch) args_array.push(branch);
        if (rebase) args_array.push("--rebase");
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          remote,
          branch: branch || "current",
          rebase,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_branch",
      description: "List, create, or delete branches",
      parameters: GitBranchSchema,
      execute: async (args: unknown) => {
        const { action, name, cwd } = GitBranchSchema.parse(args);
        
        let args_array: string[] = [];
        switch (action) {
          case "list":
            args_array = ["branch", "-a", "-v"];
            break;
          case "create":
            args_array = name ? ["checkout", "-b", name] : ["branch"];
            break;
          case "delete":
            args_array = name ? ["branch", "-d", name] : ["branch"];
            break;
          case "switch":
            args_array = name ? ["checkout", name] : ["branch"];
            break;
        }
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          action,
          branch: name,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_diff",
      description: "Show changes between commits, commit and working tree, etc",
      parameters: GitDiffSchema,
      execute: async (args: unknown) => {
        const { staged, file, cwd } = GitDiffSchema.parse(args);
        
        const args_array = staged ? ["diff", "--staged"] : ["diff"];
        if (file) args_array.push(file);
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          staged,
          file: file || "all",
          cwd: cwd || process.cwd(),
          diff: result.stdout,
          hasChanges: result.stdout.length > 0,
        };
      },
    },
    {
      name: "git_log",
      description: "Show commit logs",
      parameters: GitLogSchema,
      execute: async (args: unknown) => {
        const { maxCount, file, author, cwd } = GitLogSchema.parse(args);
        
        const args_array = [
          "log",
          `--max-count=${maxCount}`,
          "--oneline",
          "--decorate",
          "--graph",
        ];
        if (author) args_array.push(`--author=${author}`);
        if (file) args_array.push("--", file);
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          maxCount,
          author: author || "all",
          file: file || "all",
          cwd: cwd || process.cwd(),
          log: result.stdout,
        };
      },
    },
    {
      name: "git_checkout",
      description: "Switch branches or restore working tree files",
      parameters: GitCheckoutSchema,
      execute: async (args: unknown) => {
        const { target, create, cwd } = GitCheckoutSchema.parse(args);
        
        const args_array = create ? ["checkout", "-b", target] : ["checkout", target];
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          target,
          create,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_clone",
      description: "Clone a repository into a new directory",
      parameters: GitCloneSchema,
      execute: async (args: unknown) => {
        const { url, directory, depth, cwd } = GitCloneSchema.parse(args);
        
        const args_array = ["clone"];
        if (depth) args_array.push(`--depth=${depth}`);
        args_array.push(url);
        if (directory) args_array.push(directory);
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          url,
          directory: directory || url.split("/").pop()?.replace(".git", "") || "repo",
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
    {
      name: "git_stash",
      description: "Stash changes in dirty working directory",
      parameters: GitStashSchema,
      execute: async (args: unknown) => {
        const { action, message, cwd } = GitStashSchema.parse(args);
        
        let args_array: string[] = [];
        switch (action) {
          case "push":
            args_array = message ? ["stash", "push", "-m", message] : ["stash", "push"];
            break;
          case "pop":
            args_array = ["stash", "pop"];
            break;
          case "list":
            args_array = ["stash", "list"];
            break;
          case "drop":
            args_array = ["stash", "drop"];
            break;
          case "clear":
            args_array = ["stash", "clear"];
            break;
        }
        
        const result = await runGitCommand(args_array, cwd);
        
        return {
          success: result.success,
          action,
          message,
          cwd: cwd || process.cwd(),
          output: result.stdout,
          errors: result.stderr,
        };
      },
    },
  ];
}
