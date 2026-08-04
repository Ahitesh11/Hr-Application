import {
  Content,
  createModelContent,
  createPartFromFunctionCall,
  createPartFromFunctionResponse,
  createUserContent,
} from "@google/genai";
import type { AgentMessage } from "./agent";
import { getGeminiClient, getGeminiModel } from "./gemini";
import { getGeminiFunctionDeclarations } from "./geminiSchema";
import { executeTool } from "./toolExecutor";
import { ToolExecutionContext } from "../tools/BaseTool";
import { HR_AGENT_SYSTEM_PROMPT } from "../prompts/systemPrompt";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";

const MAX_TOOL_CALL_ROUNDS = 5;

export interface GeminiAgentResult {
  reply: string;
  history: AgentMessage[];
}

function buildContents(history: AgentMessage[] | undefined, message: string): Content[] {
  const contents: Content[] = (history ?? []).map((turn) =>
    turn.role === "user" ? createUserContent(turn.content) : createModelContent(turn.content)
  );
  contents.push(createUserContent(message));
  return contents;
}

/**
 * Runs one Gemini function-calling turn to completion: sends the message
 * with all registered tools attached, executes any tool(s) Gemini chooses
 * to call (possibly several in one round, run in parallel), feeds the
 * results back, and repeats until Gemini returns a final text answer or
 * MAX_TOOL_CALL_ROUNDS is hit.
 */
export async function runGeminiAgentTurn(
  message: string,
  context: ToolExecutionContext,
  history: AgentMessage[] | undefined
): Promise<GeminiAgentResult> {
  const ai = getGeminiClient();
  const model = getGeminiModel();
  const tools = [{ functionDeclarations: getGeminiFunctionDeclarations() }];

  const contents = buildContents(history, message);

  for (let round = 0; round < MAX_TOOL_CALL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction: HR_AGENT_SYSTEM_PROMPT, tools },
    });

    const calls = response.functionCalls;

    if (!calls || calls.length === 0) {
      const reply = response.text ?? "";
      return {
        reply,
        history: [...(history ?? []), { role: "user", content: message }, { role: "model", content: reply }],
      };
    }

    // The model's turn: the function call(s) it produced.
    contents.push({
      role: "model",
      parts: calls.map((call) => createPartFromFunctionCall(call.name ?? "", call.args ?? {})),
    });

    // Support multiple tool execution: run every requested call in parallel.
    const responseParts = await Promise.all(
      calls.map(async (call) => {
        const toolName = call.name ?? "";
        try {
          const result = await executeTool({ toolName, input: call.args ?? {} }, context);
          return createPartFromFunctionResponse(call.id ?? toolName, toolName, { output: result.output });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Tool execution failed";
          logger.error(`Gemini-requested tool "${toolName}" failed`, { errorMessage });
          return createPartFromFunctionResponse(call.id ?? toolName, toolName, { error: errorMessage });
        }
      })
    );

    contents.push({ role: "user", parts: responseParts });
  }

  throw ApiError.internal(`Gemini agent exceeded ${MAX_TOOL_CALL_ROUNDS} tool-call rounds without a final answer`);
}
