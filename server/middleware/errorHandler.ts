import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { ApiErrorResponse } from "../types/api.types";

/**
 * Global Express error handler. Must be registered last, after all routes.
 * Formats any thrown error into the ApiErrorResponse envelope.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const apiError = err instanceof ApiError ? err : ApiError.internal("Unexpected server error");

  logger.error(`${req.method} ${req.originalUrl} -> ${apiError.statusCode}`, {
    message: apiError.message,
    code: apiError.code,
    stack: err instanceof Error ? err.stack : undefined,
  });

  const includeDetails = apiError.isOperational || process.env.NODE_ENV !== "production";

  const body: ApiErrorResponse = {
    success: false,
    error: {
      message: apiError.message,
      code: apiError.code,
      details: includeDetails ? apiError.details : undefined,
    },
  };

  res.status(apiError.statusCode).json(body);
}
