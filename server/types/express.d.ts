import "express";

declare global {
  namespace Express {
    interface Request {
      /** Populated once auth middleware (Phase 12) verifies the caller. Undefined until then. */
      authUser?: {
        employeeId: string;
        role: string;
      };
    }
  }
}

export {};
