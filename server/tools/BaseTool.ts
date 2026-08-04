/** Identity of the employee on whose behalf a tool is being executed. */
export interface ToolExecutionContext {
  employeeId: string;
  role?: string;
}

/**
 * Contract every AI tool must implement. Generic over input/output so each
 * tool can be strongly typed while still being stored polymorphically in
 * the registry.
 */
export interface BaseTool<TInput = unknown, TOutput = unknown> {
  /** Unique, stable identifier — used for registry lookup and as the Gemini function-calling name. */
  readonly name: string;

  /** What the tool does and when to use it. This is what the LLM reads to decide whether to call it. */
  readonly description: string;

  /**
   * JSON-schema-shaped parameter definition, for Gemini function declarations.
   * Optional for now — no tool implementations exist yet to populate it.
   */
  readonly parameters?: Record<string, unknown>;

  /** Runs the tool. Each implementation owns its own logic — the registry never inspects this. */
  execute(input: TInput, context: ToolExecutionContext): Promise<TOutput>;
}
