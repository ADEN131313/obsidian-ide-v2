import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { users, insertUserSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default-secret"; // In production, use a strong secret

router.post("/register", async (req, res) => {
  const logger = req.log;
  try {
    const validation = insertUserSchema.safeParse(req.body);
    if (!validation.success) {
      res
        .status(400)
        .json({ error: "Invalid input", details: validation.error });
      return;
    }

    const { email, passwordHash } = validation.data;
    const hashedPassword = await bcrypt.hash(passwordHash, 10);

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser.length > 0) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const newUser = await db
      .insert(users)
      .values({ email, passwordHash: hashedPassword })
      .returning();
    const token = jwt.sign({ userId: newUser[0].id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token, user: { id: newUser[0].id, email } });
  } catch (error) {
    logger?.error?.({ err: error }, "Registration error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const logger = req.log;
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (userResult.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const user = userResult[0];
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    logger?.error?.({ err: error }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
