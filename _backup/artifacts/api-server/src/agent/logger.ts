import type { AgentLogger } from "./types.ts";

const noop = () => {};

export const defaultLogger: Required<AgentLogger> = {
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
};

export function normalizeLogger(input: unknown): Required<AgentLogger> {
  if (!input || typeof input !== "object") {
    return defaultLogger;
  }

  const logger = input as AgentLogger;
  return {
    debug:
      typeof logger.debug === "function" ? logger.debug.bind(logger) : noop,
    info: typeof logger.info === "function" ? logger.info.bind(logger) : noop,
    warn: typeof logger.warn === "function" ? logger.warn.bind(logger) : noop,
    error:
      typeof logger.error === "function" ? logger.error.bind(logger) : noop,
  };
}
