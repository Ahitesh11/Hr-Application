import { FunctionDeclaration } from "@google/genai";
import { toolRegistry } from "../tools";

/**
 * Converts every registered tool into Gemini's real FunctionDeclaration
 * shape. Pure data transformation, no network call — Phase 9 passes this
 * straight into the Gemini request's `tools` config.
 *
 * BaseTool.parameters is already plain JSON Schema, so it maps to
 * parametersJsonSchema (accepts raw JSON Schema) rather than `parameters`
 * (which expects Gemini's own stricter Schema type).
 */
export function getGeminiFunctionDeclarations(): FunctionDeclaration[] {
  return toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: tool.parameters,
  }));
}
