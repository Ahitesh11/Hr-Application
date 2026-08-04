/**
 * Shapes for traffic to/from the Google Apps Script web app.
 * Consumed by the GasClient service — nothing else should talk to GAS directly.
 */

export interface GasRequest {
  action: string;
  [key: string]: unknown;
}

/** A single row/record returned by a GAS "get*" action. Left untyped on purpose — callers narrow per use case. */
export type GasRecord = Record<string, unknown>;

/** The envelope GAS returns for submit/update/login/test actions. */
export interface GasOperationResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

/** Everything a GAS action can resolve to: a list of rows, an operation result, or null on failure. */
export type GasResponse<T extends GasRecord = GasRecord> = T[] | GasOperationResult | null;

export interface GasClientConfig {
  /** The deployed GAS web app exec URL. Server-side only. */
  baseUrl: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}
