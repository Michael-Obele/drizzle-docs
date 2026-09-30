/**
 * Tool return values.
 *
 * MCP wants a `{ content: [...] }` object — and, for failures, `isError: true`
 * instead of a thrown exception — so every tool builds its result here.
 */

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  // tmcp types results as a loose object, so it needs an index signature.
  [key: string]: unknown;
}

/** Pretty-printed JSON, the easiest shape for an LLM to read. */
export const json = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

/** Raw text (used for Markdown page bodies). */
export const text = (value: string): ToolResult => ({
  content: [{ type: "text", text: value }],
});

/** A failure the model should read and recover from. */
export const fail = (message: string): ToolResult => ({
  isError: true,
  content: [{ type: "text", text: message }],
});

/** Turn an unknown thrown value into a readable message. */
export const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
