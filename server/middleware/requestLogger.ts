import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

/**
 * Logs one line per request once it finishes: method, path, status, duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
