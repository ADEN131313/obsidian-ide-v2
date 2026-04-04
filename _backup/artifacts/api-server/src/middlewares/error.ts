import { type Request, type Response, type NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const logger = req.log;
  logger?.error?.({ err }, "Unhandled error");

  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.publicMessage || err.message || "Internal server error";

  res.status(statusCode).json({ error: message });
}
