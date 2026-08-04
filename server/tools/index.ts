import { BaseTool } from "./BaseTool";
import { logger } from "../utils/logger";

/**
 * Central registry every AI tool registers itself into. Deliberately dumb:
 * it only stores and retrieves tools by name. It has no opinion on what a
 * tool does, and does not call GAS or Gemini itself.
 */
class ToolRegistry {
  private readonly tools = new Map<string, BaseTool>();

  /** Registers a tool. Throws on a duplicate name so collisions fail loudly, not silently. */
  register(tool: BaseTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    logger.debug(`Tool registered: ${tool.name}`);
  }

  /** Looks up a tool by name. Throws if it isn't registered — an unknown tool name is a bug, not normal flow. */
  get(name: string): BaseTool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" is not registered`);
    }
    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** All registered tools — used later to build the Gemini function-declarations list. */
  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }
}

/** Shared singleton — tool files import this and call .register() on load. */
export const toolRegistry = new ToolRegistry();

export type { ToolRegistry };
export type { BaseTool, ToolExecutionContext } from "./BaseTool";
