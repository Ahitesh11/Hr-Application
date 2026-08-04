/**
 * Structured, throwable error carrying an HTTP status code.
 * Controllers/services throw this to control the response the error
 * middleware sends back, instead of letting a generic Error leak a 500.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  /** True for expected/handled failures (bad input, not found, etc.) vs. unexpected bugs. */
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, options?: { code?: string; details?: unknown; isOperational?: boolean }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options?.code;
    this.details = options?.details;
    this.isOperational = options?.isOperational ?? true;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, { code: "BAD_REQUEST", details });
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message, { code: "UNAUTHORIZED" });
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message, { code: "FORBIDDEN" });
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, message, { code: "NOT_FOUND" });
  }

  static internal(message = "Internal server error", details?: unknown): ApiError {
    return new ApiError(500, message, { code: "INTERNAL_ERROR", details, isOperational: false });
  }
}
