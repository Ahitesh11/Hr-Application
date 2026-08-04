import { logger } from "../utils/logger";

/** Identity of the employee making the request — passed by the controller, verified upstream. */
export interface AgentUserContext {
  employeeId: string;
  name?: string;
  role?: string;
}

export interface AgentChatInput {
  message: string;
  context: AgentUserContext;
}

export interface AgentChatOutput {
  reply: string;
}

/**
 * Placeholder entry point for the AI agent. Intentionally does nothing yet:
 * no Gemini call, no tool calling, no GAS access. This exists only to
 * establish the shape (message + user context in, reply out) that the
 * controller/route layer and, later, the real tool-calling loop will use.
 */
export async function handleAgentMessage(input: AgentChatInput): Promise<AgentChatOutput> {
  logger.info("Agent message received (agent logic not yet implemented)", {
    employeeId: input.context.employeeId,
  });

  return {
    reply: "The AI agent is not implemented yet. This is a placeholder response.",
  };
}
