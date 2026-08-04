import { ApiError } from "../utils/ApiError";
import { BaseTool, ToolExecutionContext, toolRegistry } from "./index";

export interface PolicyQaInput {
  question: string;
}

export interface PolicyQaOutput {
  answer: string;
}

/**
 * No company policy sheet/document is connected to GAS — none of the
 * existing GAS actions expose policy content. Rather than fabricate an
 * answer, this tool correctly reports the capability as not yet available.
 * Wiring a real source (a Policy sheet, or a static document fed through
 * prompts/) is a product decision, not something to guess at here.
 */
export const policyTool: BaseTool<PolicyQaInput, PolicyQaOutput> = {
  name: "company_policy_qa",
  description: "Answers company policy questions. Not yet functional — no policy data source is connected.",
  parameters: {
    type: "object",
    properties: {
      question: { type: "string", description: "The policy question being asked" },
    },
    required: ["question"],
  },
  async execute(input: PolicyQaInput, _context: ToolExecutionContext): Promise<PolicyQaOutput> {
    if (!input.question?.trim()) {
      throw ApiError.badRequest("question is required");
    }
    throw ApiError.notImplemented(
      "Company policy Q&A has no connected data source yet — no policy sheet or document exists in GAS."
    );
  },
};

toolRegistry.register(policyTool);
