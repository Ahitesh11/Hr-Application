import { GasClientConfig, GasRecord, GasRequest, GasResponse } from "../types/gas.types";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * The only class in this backend allowed to talk to the Google Apps Script
 * web app. Every GAS action goes through call() — no other file should
 * construct its own fetch() request against GAS_WEB_APP_URL.
 */
class GasClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: GasClientConfig) {
    if (!config.baseUrl) {
      throw ApiError.internal("GAS_WEB_APP_URL is not configured");
    }
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Calls a single GAS action, mirroring the {action, ...payload} body
   * the existing frontend already sends to the same web app.
   */
  async call<T extends GasRecord = GasRecord>(
    action: string,
    payload: Record<string, unknown> = {}
  ): Promise<GasResponse<T>> {
    const body: GasRequest = { action, ...payload };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw ApiError.internal(`GAS returned HTTP ${response.status} for action "${action}"`);
      }

      return (await response.json()) as GasResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      const message = error instanceof Error ? error.message : "Unknown error calling GAS";
      logger.error(`GasClient call failed for action "${action}"`, { message });
      throw ApiError.internal(`Failed to call GAS action "${action}"`, { message });
    } finally {
      clearTimeout(timeout);
    }
  }
}

let instance: GasClient | null = null;

/**
 * Lazy singleton — env vars are read on first use, not at import time,
 * so module import order relative to dotenv.config() doesn't matter.
 */
export function getGasClient(): GasClient {
  if (!instance) {
    instance = new GasClient({
      baseUrl: process.env.GAS_WEB_APP_URL ?? "",
      timeoutMs: process.env.GAS_TIMEOUT_MS ? Number(process.env.GAS_TIMEOUT_MS) : undefined,
    });
  }
  return instance;
}

export type { GasClient };
