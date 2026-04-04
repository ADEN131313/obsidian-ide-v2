import type { FastifyInstance } from "fastify";

export async function setupAuth(app: FastifyInstance): Promise<void> {
  app.decorate("authenticate", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return reply.status(401).send({ error: "No token provided" });
      }
      
      const decoded = await request.jwtVerify<{ userId: number; email: string }>();
      request.user = decoded;
    } catch (error) {
      return reply.status(401).send({ error: "Invalid token" });
    }
  });
}
