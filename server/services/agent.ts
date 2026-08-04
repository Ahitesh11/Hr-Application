import { logger } from "../utils/logger";
import { executeTool, ToolCallRequest, ToolCallResult } from "./toolExecutor";

/** Identity of the employee making the request — passed by the controller, verified upstream. */
export interface AgentUserContext {
  employeeId: string;
  name?: string;
  role?: string;
}

/** A single turn in the conversation. Populated once Phase 9 wires real multi-turn chat. */
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
}

/**
 * Placeholder entry point for free-form natural-language chat. Understanding
 * a message well enough to choose the right tool requires calling Gemini's
 * function-calling API — that's Phase 9. This intentionally still returns a
 * fixed placeholder reply rather than faking that understanding.
 *
 * Tool execution itself is no longer a placeholder — see runTool() below,
 * which Phase 9's Gemini loop will call once it decides which tool to run.
 */
export async function handleAgentMessage(input: AgentChatInput): Promise<AgentChatOutput> {
  logger.info("Agent message received (NL understanding not yet implemented)", {
    employeeId: input.context.employeeId,
  });

  return {
    reply:
      "The AI agent can't understand free-form messages yet — that requires Gemini function calling (Phase 9). Tool execution itself is ready.",
  };
}

/** Runs one already-chosen tool. Real implementation — delegates to the tool executor. */
export async function runTool(request: ToolCallRequest, context: AgentUserContext): Promise<ToolCallResult> {
  return executeTool(request, context);
}
