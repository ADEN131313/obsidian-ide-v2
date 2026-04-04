/**
 * Shared types and utilities
 */

// Result type for better error handling
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// Logger interface
export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// Simple console logger
export const consoleLogger: Logger = {
  debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta || ""),
  info: (msg, meta) => console.info(`[INFO] ${msg}`, meta || ""),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ""),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ""),
};

// Utility functions
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
