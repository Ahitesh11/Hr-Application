import { Response } from "express";
import { ApiSuccessResponse } from "../types/api.types";

/** Builds the standard success envelope. Controllers use sendSuccess() rather than this directly. */
export function formatSuccess<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/** Sends a standard { success: true, data } response. The success-side counterpart to errorHandler. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json(formatSuccess(data));
}
