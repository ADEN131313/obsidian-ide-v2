import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { ObsidianChatAgent } from "../agent/chat-agent";
import {
  ENABLED_CAPABILITIES,
  PERMISSION_POLICY_TEXT,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  UNRESTRICTED_PERMISSION_OVERRIDE,
} from "../agent/config";
import { SlidingWindowRateLimiter } from "../agent/rate-limiter";
import { closeSse, initializeSse, writeSse } from "../agent/sse";
import type { ChatRequestBody } from "../agent/types";
import { validateRequestBody } from "../agent/validation";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();
const rateLimiter = new SlidingWindowRateLimiter(
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
);
const agentApiKey = process.env.OBSIDIAN_AGENT_API_KEY?.trim() || "";

router.post(
  "/chat",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const logger = req.log;
    const agent = new ObsidianChatAgent(openai, logger);
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      const rateLimit = rateLimiter.check(clientIp);
      if (!rateLimit.allowed) {
        res.setHeader("X-RateLimit-Limit", String(rateLimit.limit));
        res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
        res.setHeader("X-RateLimit-Reset", String(rateLimit.resetAt));
        res
          .status(429)
          .json({ error: "Rate limit exceeded. Try again shortly." });
        return;
      }

      const validation = validateRequestBody(req.body as ChatRequestBody);
      if (validation.ok === false) {
        res.status(validation.statusCode).json({ error: validation.error });
        return;
      }

      res.setHeader(
        "X-Agent-Unrestricted-Mode",
        String(UNRESTRICTED_PERMISSION_OVERRIDE),
      );
      res.setHeader(
        "X-Agent-Capability-Count",
        String(ENABLED_CAPABILITIES.size),
      );
      res.setHeader("X-Agent-Capability-Policy", PERMISSION_POLICY_TEXT);
      initializeSse(res);

      // Create conversation
      const conversationTitle =
        typeof validation.value.message === "string"
          ? validation.value.message.slice(0, 50) +
            (validation.value.message.length > 50 ? "..." : "")
          : "New Chat";
      const newConversation = await db
        .insert(conversations)
        .values({
          userId: req.user!.userId,
          title: conversationTitle,
        })
        .returning();

      // Save user message
      await db.insert(messages).values({
        conversationId: newConversation[0].id,
        role: "user",
        content:
          typeof validation.value.message === "string"
            ? validation.value.message
            : JSON.stringify(validation.value.message),
      });

      let assistantContent = "";
      const usage = await agent.streamCompletion(validation.value, {
        onToken: (content) => {
          assistantContent += content;
          writeSse(res, { content });
        },
      });

      // Save assistant message
      await db.insert(messages).values({
        conversationId: newConversation[0].id,
        role: "assistant",
        content: assistantContent,
      });

      writeSse(res, {
        done: true,
        usage,
        conversationId: newConversation[0].id,
      });
      closeSse(res);
    } catch (error) {
      logger?.error?.({ err: error }, "Chat stream error");
      if (!res.headersSent) {
        const typedError = error as {
          statusCode?: number;
          publicMessage?: string;
        };
        const statusCode =
          typeof typedError.statusCode === "number"
            ? typedError.statusCode
            : 500;
        const publicMessage =
          typeof typedError.publicMessage === "string"
            ? typedError.publicMessage
            : "Internal server error";
        res.status(statusCode).json({ error: publicMessage });
      } else {
        const typedError = error as { publicMessage?: string; code?: string };
        writeSse(res, {
          error: typedError.publicMessage ?? "Stream error",
          code: typedError.code,
        });
        closeSse(res);
      }
    }
  },
);

export default router;
