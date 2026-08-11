/**
 * Minimal AI provider abstraction. StudyOS has a single AI choke point
 * (features/ai/client#generateStructured); a provider just turns a
 * {system, prompt, jsonSchema} request into the RAW structured data (an object
 * conforming to jsonSchema). generateStructured still owns the aiEnabled gate,
 * Zod validation, and error classification — providers only do the transport.
 *
 * This keeps prompts, schemas, the generation guard, usage/entitlement, and the
 * UI unchanged: only the transport differs between Gemini and Manus.
 */
export type GenerateInput = {
  /** StudyOS system prompt (unchanged). */
  system: string;
  /** StudyOS generation prompt (unchanged). */
  prompt: string;
  /** JSON Schema derived from the Zod schema (z.toJSONSchema). */
  jsonSchema: Record<string, unknown>;
  /** Per-request timeout budget (ms). */
  timeoutMs: number;
  /** Reasoning-heavy hint (Gemini "thinking"; Manus ignores it). */
  useThinking: boolean;
  /** SDK retry attempts (Gemini only). */
  retryAttempts: number;
  /** Model/profile id from admin settings (Gemini model name). */
  model: string;
};

export interface AIProvider {
  /** Provider id for logs ("gemini" | "manus"). */
  readonly name: string;
  /** Returns the raw structured result (pre-Zod-parse). Throws on failure; the
   * caller classifies the error into a user-safe AiGenerationError. */
  generate(input: GenerateInput): Promise<unknown>;
}
