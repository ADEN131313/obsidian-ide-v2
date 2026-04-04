import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { db, conversations, messages } from "@obsidian/db";
import { eq } from "drizzle-orm";

export default async function chatRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Get user's conversations
  app.get("/conversations", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.updatedAt);

    return reply.send({ conversations: userConversations });
  });

  // Get conversation with messages
  app.get("/conversations/:id", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { id } = request.params as { id: string };
    
    const convResult = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, parseInt(id, 10)))
      .limit(1);

    if (convResult.length === 0) {
      return reply.status(404).send({ error: "Conversation not found" });
    }

    const conversation = convResult[0];
    if (conversation.userId !== userId) {
      return reply.status(403).send({ error: "Not authorized" });
    }

    const convMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    return reply.send({
      conversation,
      messages: convMessages,
    });
  });

  // Create new conversation
  app.post("/conversations", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { title, model, systemPrompt } = request.body as {
      title?: string;
      model?: string;
      systemPrompt?: string;
    };

    const newConversation = await db
      .insert(conversations)
      .values({
        userId,
        title: title || "New Conversation",
        model: model || "gpt-4",
        systemPrompt,
      })
      .returning();

    return reply.status(201).send({ conversation: newConversation[0] });
  });

  // Stream chat completion
  app.post("/stream", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const { conversationId, message } = request.body as {
      conversationId: number;
      message: string;
    };

    // Set up SSE
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Save user message
    await db.insert(messages).values({
      conversationId,
      role: "user",
      content: message,
    });

    // TODO: Integrate with AI agent for streaming response
    reply.raw.write(`data: ${JSON.stringify({ type: "message", content: "Processing..." })}\n\n`);
    reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    reply.raw.end();
  });
}
