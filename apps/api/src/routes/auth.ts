import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { db, users, insertUserSchema, type NewUser } from "@obsidian/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export default async function authRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Register
  app.post("/register", async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: result.error.format(),
      });
    }

    const { email, password, name } = result.data;

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.status(409).send({ error: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
      })
      .returning();

    const user = newUser[0];

    // Generate token
    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });

  // Login
  app.post("/login", async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: "Invalid input",
        details: result.error.format(),
      });
    }

    const { email, password } = result.data;

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (userResult.length === 0) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const user = userResult[0];

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    // Generate token
    const token = app.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });

  // Get current user
  app.get("/me", { onRequest: [app.authenticate] }, async (request, reply) => {
    const userId = request.user.userId;
    const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (userResult.length === 0) {
      return reply.status(404).send({ error: "User not found" });
    }

    const user = userResult[0];
    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });
  });
}

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  
  interface FastifyRequest {
    user: { userId: number; email: string };
  }
}
