import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

// Health check function
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    await pool.query("SELECT 1");
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

export * from "./schema/index.js";
