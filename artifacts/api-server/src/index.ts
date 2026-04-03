import * as Sentry from "@sentry/node";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { db } from "@workspace/db";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/error";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ level: process.env.LOG_LEVEL || "info" }));

// Routes
app.use("/api", routes);

// Sentry error handler
app.use(Sentry.expressIntegration());

// Error handling
app.use(errorHandler);

// Health check with DB
app.get("/api/healthz", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    req.log?.error?.({ err: error }, "Database health check failed");
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
