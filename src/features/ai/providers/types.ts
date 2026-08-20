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
  /** Reasoning-heavy hint (Gemini "thinking"; other providers may ignore it). */
  useThinking: boolean;
  /** SDK retry attempts (Gemini only). */
  retryAttempts: number;
  /** Model/profile id from admin settings (Gemini model name). */
  model: string;
};

/** Input for generateStream() — deliberately narrower than GenerateInput: no
 * jsonSchema (free-form text only) and no retryAttempts (see generateStream's
 * doc comment for why retrying mid-stream doesn't make sense). */
export type GenerateStreamInput = {
  system: string;
  prompt: string;
  timeoutMs: number;
  useThinking: boolean;
  model: string;
};

export interface AIProvider {
  /** Provider id for logs ("gemini" | "manus"). */
  readonly name: string;
  /** Returns the raw structured result (pre-Zod-parse). Throws on failure; the
   * caller classifies the error into a user-safe AiGenerationError. */
  generate(input: GenerateInput): Promise<unknown>;
  /**
   * Streams raw text chunks for free-form (non-JSON-schema) generations, e.g.
   * the AI Tutor's chat turns (features/tutor/ai.ts#runTutorTurnStream). There
   * is no jsonSchema here — a caller that needs structure out of a streamed
   * reply parses it out of the accumulated text itself (see
   * features/tutor/chat-stream.ts's sentinel convention) rather than forcing
   * the provider into strict-schema mode, which streams awkwardly as JSON
   * fragments instead of readable text.
   *
   * Only covers connection-establishment retries internally (if at all) — once
   * a chunk has been yielded to the caller, a retry would duplicate text the
   * student has already seen on screen, so a mid-stream failure just throws.
   */
  generateStream(input: GenerateStreamInput): AsyncGenerator<string, void, void>;
}
