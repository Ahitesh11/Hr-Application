import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/ApiError";

/** Fallback only — override via GEMINI_MODEL, never hardcode a model at a call site. */
const DEFAULT_MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | null = null;

/**
 * Lazy singleton — constructed on first use so a missing GEMINI_API_KEY
 * doesn't throw at import time, only when something actually needs Gemini.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw ApiError.internal("GEMINI_API_KEY is not configured");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** The active model name, resolved from env so it can change without a code change. */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}
