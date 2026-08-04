import { toolRegistry } from "../tools";
import { ToolExecutionContext } from "../tools/BaseTool";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

export interface ToolCallRequest {
  toolName: string;
  input: unknown;
}

export interface ToolCallResult {
  toolName: string;
  output: unknown;
}

/**
 * Executes an already-chosen tool by name. This is the "Tool Manager"
 * responsibility merged into the Agent Engine rather than kept as a
 * separate file (agreed during Phase 6) — ToolRegistry stays pure
 * storage/lookup; this is the one place that actually invokes a tool.
 */
export async function executeTool(
  request: ToolCallRequest,
  context: ToolExecutionContext
): Promise<ToolCallResult> {
  if (!toolRegistry.has(request.toolName)) {
    throw ApiError.badRequest(`Unknown tool: "${request.toolName}"`);
  }

  const tool = toolRegistry.get(request.toolName);

  try {
    const output = await tool.execute(request.input, context);
    return { toolName: tool.name, output };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown tool execution error";
    logger.error(`Tool "${tool.name}" execution failed`, { message });
    throw ApiError.internal(`Tool "${tool.name}" failed: ${message}`);
  }
}
