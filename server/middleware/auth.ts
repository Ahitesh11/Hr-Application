import { NextFunction, Request, Response } from "express";

/**
 * Placeholder only. Passes every request through unverified and sets
 * nothing on req.authUser. No route currently registers this middleware.
 * Phase 12 replaces this implementation with real verification (rejecting
 * unauthenticated/unauthorized requests) — it stays the same file/export
 * so nothing that references it later needs to change.
 */
export function auth(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
