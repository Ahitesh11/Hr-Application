import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

/**
 * Catches any request that didn't match a route. Mounted after all routes,
 * before errorHandler, so unmatched routes still return the standard
 * ApiErrorResponse envelope instead of Express's default HTML 404.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}
