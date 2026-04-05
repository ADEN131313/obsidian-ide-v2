import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * File system tools for the AI agent
 */

const ReadFileSchema = z.object({
  path: z.string().describe("Path to the file to read"),
});

const WriteFileSchema = z.object({
  path: z.string().describe("Path to write the file"),
  content: z.string().describe("Content to write"),
});

const SearchFilesSchema = z.object({
  pattern: z.string().describe("Search pattern (glob or regex)"),
  searchPath: z.string().optional().describe("Directory to search in"),
});

const ListDirectorySchema = z.object({
  path: z.string().describe("Directory path to list"),
});

export function createFileSystemTools(
  fs: typeof import("fs/promises"),
  path: typeof import("path")
): Tool[] {
  return [
    {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: ReadFileSchema,
      execute: async (args: unknown) => {
        const { path: filePath } = ReadFileSchema.parse(args);
        const content = await fs.readFile(filePath, "utf-8");
        return { content, path: filePath };
      },
    },
    {
      name: "write_file",
      description: "Write content to a file (creates or overwrites)",
      parameters: WriteFileSchema,
      execute: async (args: unknown) => {
        const { path: filePath, content } = WriteFileSchema.parse(args);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, "utf-8");
        return { success: true, path: filePath, bytesWritten: content.length };
      },
    },
    {
      name: "search_files",
      description: "Search for files matching a pattern",
      parameters: SearchFilesSchema,
      execute: async (args: unknown) => {
        const { pattern, searchPath = "." } = SearchFilesSchema.parse(args);
        // Simple glob implementation - in production use glob or fast-glob
        const results: string[] = [];
        await searchRecursive(fs, path, searchPath, pattern, results);
        return { results, count: results.length };
      },
    },
    {
      name: "list_directory",
      description: "List contents of a directory",
      parameters: ListDirectorySchema,
      execute: async (args: unknown) => {
        const { path: dirPath } = ListDirectorySchema.parse(args);
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return {
          path: dirPath,
          entries: entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          })),
        };
      },
    },
  ];
}

async function searchRecursive(
  fs: typeof import("fs/promises"),
  path: typeof import("path"),
  dir: string,
  pattern: string,
  results: string[]
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        await searchRecursive(fs, path, fullPath, pattern, results);
      }
    } else {
      // Simple pattern matching - in production use minimatch
      if (entry.name.includes(pattern) || fullPath.includes(pattern)) {
        results.push(fullPath);
      }
    }
  }
}
