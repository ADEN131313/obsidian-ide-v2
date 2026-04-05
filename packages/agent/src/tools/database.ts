import { z } from "zod";
import type { Tool } from "./registry.js";

/**
 * Database query and management tools for the AI agent
 * Allows the agent to interact with the PostgreSQL database
 */

const ExecuteQuerySchema = z.object({
  query: z.string().describe("SQL query to execute (SELECT only for safety)"),
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().describe("Query parameters"),
  readonly: z.boolean().default(true).describe("Whether this is a read-only query"),
});

const ListTablesSchema = z.object({
  schema: z.string().default("public").describe("Database schema"),
});

const DescribeTableSchema = z.object({
  table: z.string().describe("Table name to describe"),
  schema: z.string().default("public").describe("Database schema"),
});

const RunMigrationSchema = z.object({
  direction: z.enum(["up", "down"]).default("up").describe("Migration direction"),
  count: z.number().optional().describe("Number of migrations to run (default: all)"),
});

const AnalyzeDataSchema = z.object({
  table: z.string().describe("Table to analyze"),
  column: z.string().optional().describe("Specific column to analyze"),
});

const GetTableStatsSchema = z.object({
  table: z.string().describe("Table name"),
});

const SearchDataSchema = z.object({
  table: z.string().describe("Table to search"),
  column: z.string().describe("Column to search in"),
  searchTerm: z.string().describe("Search term (ILIKE pattern)"),
  limit: z.number().default(10).describe("Maximum results"),
});

export interface DatabaseOperations {
  executeQuery<T = unknown>(query: string, params?: unknown[], readonly?: boolean): Promise<T[]>;
  listTables(schema?: string): Promise<string[]>;
  describeTable(table: string, schema?: string): Promise<Array<{ column: string; type: string; nullable: boolean; default: string | null }>>;
  runMigrations(direction: "up" | "down", count?: number): Promise<{ executed: number }>;
  analyzeTable(table: string, column?: string): Promise<{
    rowCount: number;
    columnStats: Record<string, { nullCount: number; uniqueCount: number; avgLength?: number }>;
  }>;
  getTableStats(table: string): Promise<{
    rowCount: number;
    size: string;
    indexes: string[];
  }>;
  searchData(table: string, column: string, searchTerm: string, limit: number): Promise<unknown[]>;
}

export function createDatabaseTools(
  db: DatabaseOperations
): Tool[] {
  return [
    {
      name: "db_execute_query",
      description: "Execute a SQL query (SELECT only by default for safety)",
      parameters: ExecuteQuerySchema,
      execute: async (args: unknown) => {
        const { query, params = [], readonly } = ExecuteQuerySchema.parse(args);
        
        // Safety check: only allow SELECT queries if readonly
        if (readonly) {
          const normalizedQuery = query.trim().toLowerCase();
          if (!normalizedQuery.startsWith("select")) {
            return {
              success: false,
              error: "Only SELECT queries are allowed in read-only mode. Set readonly: false for write operations.",
            };
          }
        }
        
        try {
          const results = await db.executeQuery(query, params, readonly);
          return {
            success: true,
            query,
            params,
            rowCount: results.length,
            results: results.slice(0, 100), // Limit results to avoid huge payloads
            truncated: results.length > 100,
          };
        } catch (error) {
          return {
            success: false,
            query,
            error: error instanceof Error ? error.message : "Query execution failed",
          };
        }
      },
    },
    {
      name: "db_list_tables",
      description: "List all tables in the database schema",
      parameters: ListTablesSchema,
      execute: async (args: unknown) => {
        const { schema } = ListTablesSchema.parse(args);
        
        try {
          const tables = await db.listTables(schema);
          return {
            success: true,
            schema,
            tables,
            count: tables.length,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to list tables",
          };
        }
      },
    },
    {
      name: "db_describe_table",
      description: "Get schema information for a specific table",
      parameters: DescribeTableSchema,
      execute: async (args: unknown) => {
        const { table, schema } = DescribeTableSchema.parse(args);
        
        try {
          const columns = await db.describeTable(table, schema);
          return {
            success: true,
            table,
            schema,
            columns,
            columnCount: columns.length,
          };
        } catch (error) {
          return {
            success: false,
            table,
            error: error instanceof Error ? error.message : "Failed to describe table",
          };
        }
      },
    },
    {
      name: "db_run_migrations",
      description: "Run database migrations up or down",
      parameters: RunMigrationSchema,
      execute: async (args: unknown) => {
        const { direction, count } = RunMigrationSchema.parse(args);
        
        try {
          const result = await db.runMigrations(direction, count);
          return {
            success: true,
            direction,
            executed: result.executed,
            message: `${result.executed} migrations ${direction === "up" ? "applied" : "reverted"}`,
          };
        } catch (error) {
          return {
            success: false,
            direction,
            error: error instanceof Error ? error.message : "Migration failed",
          };
        }
      },
    },
    {
      name: "db_analyze_data",
      description: "Analyze data distribution in a table",
      parameters: AnalyzeDataSchema,
      execute: async (args: unknown) => {
        const { table, column } = AnalyzeDataSchema.parse(args);
        
        try {
          const analysis = await db.analyzeTable(table, column);
          return {
            success: true,
            table,
            column: column || "all",
            ...analysis,
          };
        } catch (error) {
          return {
            success: false,
            table,
            error: error instanceof Error ? error.message : "Analysis failed",
          };
        }
      },
    },
    {
      name: "db_get_table_stats",
      description: "Get statistics about a table",
      parameters: GetTableStatsSchema,
      execute: async (args: unknown) => {
        const { table } = GetTableStatsSchema.parse(args);
        
        try {
          const stats = await db.getTableStats(table);
          return {
            success: true,
            table,
            ...stats,
          };
        } catch (error) {
          return {
            success: false,
            table,
            error: error instanceof Error ? error.message : "Failed to get stats",
          };
        }
      },
    },
    {
      name: "db_search_data",
      description: "Search for data in a specific table and column",
      parameters: SearchDataSchema,
      execute: async (args: unknown) => {
        const { table, column, searchTerm, limit } = SearchDataSchema.parse(args);
        
        try {
          const results = await db.searchData(table, column, searchTerm, limit);
          return {
            success: true,
            table,
            column,
            searchTerm,
            matchCount: results.length,
            results: results.slice(0, limit),
          };
        } catch (error) {
          return {
            success: false,
            table,
            searchTerm,
            error: error instanceof Error ? error.message : "Search failed",
          };
        }
      },
    },
  ];
}
