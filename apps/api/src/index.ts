import fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { db, checkDatabaseHealth } from "@obsidian/db";
import { consoleLogger } from "@obsidian/shared";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chat.js";
import { fileRoutes } from "./routes/files.js";
import { healthRoutes } from "./routes/health.js";

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV === "development" ? {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    } : undefined,
  },
});

// Register plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
});

await app.register(websocket);

// Register routes
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(chatRoutes, { prefix: "/api/chat" });
await app.register(fileRoutes, { prefix: "/api/files" });
await app.register(healthRoutes, { prefix: "/api/health" });

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      error: "Validation failed",
      details: error.message,
    });
  }
  
  return reply.status(500).send({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Not found handler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: "Not found",
    path: request.url,
  });
});

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`Server running at http://${host}:${port}`);
  
  // Check database health
  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.healthy) {
    app.log.error(`Database connection failed: ${dbHealth.error}`);
  } else {
    app.log.info("Database connection healthy");
  }
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
