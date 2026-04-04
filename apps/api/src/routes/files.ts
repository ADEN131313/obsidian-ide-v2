import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db, files } from "@obsidian/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createFileSchema = z.object({
  path: z.string(),
  content: z.string().default(""),
  language: z.string().default("obsidian"),
  isDirectory: z.boolean().default(false),
  parentId: z.number().optional(),
});

const updateFileSchema = z.object({
  content: z.string().optional(),
  path: z.string().optional(),
});

export default async function fileRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Get all files for user
  app.get("/", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    
    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(files.path);

    return reply.send({ files: userFiles });
  });

  // Get file by ID
  app.get("/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    
    const fileResult = await db
      .select()
      .from(files)
      .where(and(eq(files.id, parseInt(id, 10)), eq(files.userId, userId)))
      .limit(1);

    if (fileResult.length === 0) {
      return reply.status(404).send({ error: "File not found" });
    }

    return reply.send({ file: fileResult[0] });
  });

  // Create new file
  app.post("/", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const result = createFileSchema.safeParse(request.body);
    
    if (!result.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: result.error.format(),
      });
    }

    const newFile = await db
      .insert(files)
      .values({
        userId,
        ...result.data,
      })
      .returning();

    return reply.status(201).send({ file: newFile[0] });
  });

  // Update file
  app.patch("/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    
    const result = updateFileSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: result.error.format(),
      });
    }

    const updated = await db
      .update(files)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
      .where(and(eq(files.id, parseInt(id, 10)), eq(files.userId, userId)))
      .returning();

    if (updated.length === 0) {
      return reply.status(404).send({ error: "File not found" });
    }

    return reply.send({ file: updated[0] });
  });

  // Delete file
  app.delete("/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };

    const deleted = await db
      .delete(files)
      .where(and(eq(files.id, parseInt(id, 10)), eq(files.userId, userId)))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({ error: "File not found" });
    }

    return reply.status(204).send();
  });
}
