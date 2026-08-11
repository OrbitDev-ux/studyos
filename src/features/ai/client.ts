import { z, type ZodType } from "zod";
import { getAllSettings } from "@/lib/admin/settings";
import { AiGenerationError, classifyAiError } from "@/features/ai/errors";
import { getProvider } from "@/features/ai/providers";

// Re-export so existing call sites can import error helpers from the client.
export { AiGenerationError, aiErrorResult } from "@/features/ai/errors";
export type { AiErrorCode } from "@/features/ai/errors";

/**
 * All AI-backed features call through here instead of a provider SDK directly,
 * so swapping the AI provider (Gemini ↔ Manus, via AI_PROVIDER) only touches the
 * provider layer. This function still owns the admin kill-switch, the JSON
 * Schema, and Zod validation — prompts, schemas, the generation guard, usage/
 * entitlement, and the UI are all unchanged.
 */
export async function generateStructured<T>({
  system,
  prompt,
  schema,
  useThinking = false,
  timeoutMs = 30_000,
  retryAttempts = 2,
}: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  /** Enable thinking for reasoning-heavy tasks (analysis, explanations). */
  useThinking?: boolean;
  /** Per-request SDK timeout. Heavier generations (e.g. study books) need more
   * than the 30s default, which otherwise aborts the request mid-generation. */
  timeoutMs?: number;
  /** SDK retry attempts. Use 1 (no retry) for long single-shot generations so
   * a timeout doesn't multiply into >2× the wall time and blow the function limit. */
  retryAttempts?: number;
}): Promise<T> {
  const { aiEnabled, aiModel } = await getAllSettings();
  if (!aiEnabled) {
    throw new AiGenerationError(
      "disabled",
      "AI 기능이 현재 비활성화되어 있어요. 잠시 후 다시 시도해주세요.",
    );
  }

  const provider = getProvider();
  // Standard JSON Schema (draft 2020-12) — Gemini uses it as responseJsonSchema,
  // Manus as structured_output_schema. Shared, unchanged per feature.
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

  let raw: unknown;
  try {
    raw = await provider.generate({
      system,
      prompt,
      jsonSchema,
      timeoutMs,
      useThinking,
      retryAttempts,
      model: aiModel,
    });
  } catch (err) {
    // Never propagate the provider's raw error (e.g. Gemini's 429 body leaks
    // billing text). Classify into a user-safe AiGenerationError.
    const classified = classifyAiError(err);
    console.error(
      `AI generate failed (${provider.name}, ${classified.code}):`,
      err instanceof Error ? err.name : typeof err,
    );
    throw classified;
  }

  // A malformed response / schema mismatch throws ZodError here (intentionally
  // NOT wrapped) so the generation guard records it as validation_failed.
  return schema.parse(raw);
}
