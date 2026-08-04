import { logger } from "../utils/logger";
import { executeTool, ToolCallRequest, ToolCallResult } from "./toolExecutor";
import { runGeminiAgentTurn } from "./geminiFunctionCalling";

/** Identity of the employee making the request — passed by the controller, verified upstream. */
export interface AgentUserContext {
  employeeId: string;
  name?: string;
  role?: string;
}

/** A single turn in the conversation. */
export interface AgentMessage {
  role: "user" | "model";
  content: string;
}

export interface AgentChatInput {
  message: string;
  context: AgentUserContext;
  /** Prior turns in this conversation, oldest first. Optional — empty/omitted for a first message. */
  history?: AgentMessage[];
}

export interface AgentChatOutput {
  reply: string;
  /** Updated transcript (input history + this turn). The caller persists and replays this on the next request. */
  history: AgentMessage[];
}

/**
 * Entry point for free-form natural-language chat. Runs a Gemini
 * function-calling turn: Gemini decides whether to call one or more of the
 * registered tools, they're executed for real, and Gemini produces the
 * final reply from their results.
 */
export async function handleAgentMessage(input: AgentChatInput): Promise<AgentChatOutput> {
  logger.info("Agent message received", { employeeId: input.context.employeeId });

  const { reply, history } = await runGeminiAgentTurn(input.message, input.context, input.history);
  return { reply, history };
}

/** Runs one already-chosen tool directly, bypassing Gemini. Used by callers that already know which tool they want. */
export async function runTool(request: ToolCallRequest, context: AgentUserContext): Promise<ToolCallResult> {
  return executeTool(request, context);
}
