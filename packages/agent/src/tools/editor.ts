import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * Monaco Editor integration tools for the AI agent
 * These tools allow the agent to interact with the Monaco Editor in the frontend
 */

const InsertTextSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
  position: z.object({
    lineNumber: z.number().describe("Line number (1-based)"),
    column: z.number().describe("Column number (1-based)"),
  }).describe("Position to insert text"),
  text: z.string().describe("Text to insert"),
});

const ReplaceRangeSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
  range: z.object({
    startLineNumber: z.number().describe("Start line number (1-based)"),
    startColumn: z.number().describe("Start column (1-based)"),
    endLineNumber: z.number().describe("End line number (1-based)"),
    endColumn: z.number().describe("End column (1-based)"),
  }).describe("Range to replace"),
  text: z.string().describe("Replacement text"),
});

const DeleteRangeSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
  range: z.object({
    startLineNumber: z.number().describe("Start line number (1-based)"),
    startColumn: z.number().describe("Start column (1-based)"),
    endLineNumber: z.number().describe("End line number (1-based)"),
    endColumn: z.number().describe("End column (1-based)"),
  }).describe("Range to delete"),
});

const GetPositionSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
});

const SetSelectionSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
  selection: z.object({
    startLineNumber: z.number().describe("Start line number (1-based)"),
    startColumn: z.number().describe("Start column (1-based)"),
    endLineNumber: z.number().describe("End line number (1-based)"),
    endColumn: z.number().describe("End column (1-based)"),
  }).describe("Selection range"),
});

const ApplyWorkspaceEditSchema = z.object({
  edits: z.array(z.object({
    filePath: z.string().describe("File to edit"),
    range: z.object({
      startLineNumber: z.number(),
      startColumn: z.number(),
      endLineNumber: z.number(),
      endColumn: z.number(),
    }),
    text: z.string().describe("Replacement text"),
  })).describe("Array of edits to apply"),
});

const FindAndReplaceSchema = z.object({
  filePath: z.string().describe("Path to the file being edited"),
  findText: z.string().describe("Text to find"),
  replaceText: z.string().describe("Text to replace with"),
  replaceAll: z.boolean().default(false).describe("Replace all occurrences"),
});

const FormatDocumentSchema = z.object({
  filePath: z.string().describe("Path to the file to format"),
});

const GetDiagnosticsSchema = z.object({
  filePath: z.string().describe("Path to the file"),
});

export interface EditorOperations {
  insertText(filePath: string, position: { lineNumber: number; column: number }, text: string): Promise<void>;
  replaceRange(filePath: string, range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }, text: string): Promise<void>;
  deleteRange(filePath: string, range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }): Promise<void>;
  getPosition(filePath: string): Promise<{ lineNumber: number; column: number }>;
  setSelection(filePath: string, selection: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }): Promise<void>;
  applyWorkspaceEdit(edits: Array<{ filePath: string; range: any; text: string }>): Promise<void>;
  findAndReplace(filePath: string, findText: string, replaceText: string, replaceAll: boolean): Promise<{ replacements: number }>;
  formatDocument(filePath: string): Promise<void>;
  getDiagnostics(filePath: string): Promise<Array<{ message: string; severity: string; line: number; column: number }>>;
}

export function createEditorTools(
  fs: typeof import("fs/promises"),
  operations: EditorOperations
): Tool[] {
  return [
    {
      name: "editor_insert_text",
      description: "Insert text at a specific position in the editor",
      parameters: InsertTextSchema,
      execute: async (args: unknown) => {
        const { filePath, position, text } = InsertTextSchema.parse(args);
        await operations.insertText(filePath, position, text);
        return { success: true, filePath, position, insertedLength: text.length };
      },
    },
    {
      name: "editor_replace_range",
      description: "Replace text within a specific range in the editor",
      parameters: ReplaceRangeSchema,
      execute: async (args: unknown) => {
        const { filePath, range, text } = ReplaceRangeSchema.parse(args);
        await operations.replaceRange(filePath, range, text);
        return { success: true, filePath, range, replacementLength: text.length };
      },
    },
    {
      name: "editor_delete_range",
      description: "Delete text within a specific range in the editor",
      parameters: DeleteRangeSchema,
      execute: async (args: unknown) => {
        const { filePath, range } = DeleteRangeSchema.parse(args);
        await operations.deleteRange(filePath, range);
        return { success: true, filePath, range };
      },
    },
    {
      name: "editor_get_position",
      description: "Get the current cursor position in the editor",
      parameters: GetPositionSchema,
      execute: async (args: unknown) => {
        const { filePath } = GetPositionSchema.parse(args);
        const position = await operations.getPosition(filePath);
        return { success: true, filePath, position };
      },
    },
    {
      name: "editor_set_selection",
      description: "Set the text selection in the editor",
      parameters: SetSelectionSchema,
      execute: async (args: unknown) => {
        const { filePath, selection } = SetSelectionSchema.parse(args);
        await operations.setSelection(filePath, selection);
        return { success: true, filePath, selection };
      },
    },
    {
      name: "editor_apply_workspace_edit",
      description: "Apply multiple edits across multiple files atomically",
      parameters: ApplyWorkspaceEditSchema,
      execute: async (args: unknown) => {
        const { edits } = ApplyWorkspaceEditSchema.parse(args);
        await operations.applyWorkspaceEdit(edits);
        return { success: true, editCount: edits.length };
      },
    },
    {
      name: "editor_find_and_replace",
      description: "Find and replace text in a file",
      parameters: FindAndReplaceSchema,
      execute: async (args: unknown) => {
        const { filePath, findText, replaceText, replaceAll } = FindAndReplaceSchema.parse(args);
        const result = await operations.findAndReplace(filePath, findText, replaceText, replaceAll);
        return { success: true, filePath, ...result };
      },
    },
    {
      name: "editor_format_document",
      description: "Format the entire document using Monaco's formatter",
      parameters: FormatDocumentSchema,
      execute: async (args: unknown) => {
        const { filePath } = FormatDocumentSchema.parse(args);
        await operations.formatDocument(filePath);
        return { success: true, filePath };
      },
    },
    {
      name: "editor_get_diagnostics",
      description: "Get errors and warnings for a file",
      parameters: GetDiagnosticsSchema,
      execute: async (args: unknown) => {
        const { filePath } = GetDiagnosticsSchema.parse(args);
        const diagnostics = await operations.getDiagnostics(filePath);
        return { success: true, filePath, diagnostics, count: diagnostics.length };
      },
    },
  ];
}
