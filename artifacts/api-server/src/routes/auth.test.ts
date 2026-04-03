import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import authRouter from "./auth";

const app = express();
app.use(express.json());
app.use("/auth", authRouter);

describe("Auth Routes", () => {
  it("should register a new user", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", passwordHash: "password123" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
  });

  it("should login user", async () => {
    // First register
    await request(app)
      .post("/auth/register")
      .send({ email: "test2@example.com", passwordHash: "password123" });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test2@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });
});
