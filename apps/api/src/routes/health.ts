import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { checkDatabaseHealth } from "@obsidian/db";

export default async function healthRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Basic health check
  app.get("/", async (_request, reply) => {
    return reply.send({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    });
  });

  // Detailed health check with DB
  app.get("/detailed", async (_request, reply) => {
    const dbHealth = await checkDatabaseHealth();
    
    const status = dbHealth.healthy ? "healthy" : "degraded";
    const code = dbHealth.healthy ? 200 : 503;

    return reply.status(code).send({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth.healthy ? "healthy" : "unhealthy",
        databaseError: dbHealth.error,
      },
    });
  });
}
