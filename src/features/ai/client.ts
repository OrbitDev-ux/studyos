import { GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";
import { getAllSettings } from "@/lib/admin/settings";
import { AiGenerationError, classifyAiError } from "@/features/ai/errors";

// Re-export so existing call sites can import error helpers from the client.
export { AiGenerationError, aiErrorResult } from "@/features/ai/errors";
export type { AiErrorCode } from "@/features/ai/errors";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * All AI-backed features call through here instead of the SDK directly, so a
 * model swap or a retry/logging policy only ever needs to change this file.
 * The admin AI settings (kill-switch + model selection) are read here so a
 * single toggle governs every AI feature.
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

  let response;
  try {
    response = await ai.models.generateContent({
      model: aiModel,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        // Zod's own JSON Schema output (draft 2020-12, no target override) —
        // Gemini's `responseSchema` field only accepts a restricted
        // OpenAPI-3.0-like subset that has known conversion bugs for some Zod
        // constructs; `responseJsonSchema` accepts standard JSON Schema instead.
        responseJsonSchema: z.toJSONSchema(schema),
        thinkingConfig: useThinking ? { thinkingBudget: -1 } : undefined,
        // SDK-native timeout + retry (exponential backoff on 408/429/5xx) so a
        // slow or transient Gemini failure doesn't hang a Server Action
        // indefinitely or fail on the first blip.
        httpOptions: {
          timeout: timeoutMs,
          retryOptions: { attempts: retryAttempts },
        },
      },
    });
  } catch (err) {
    // Never propagate the provider's raw error (429 body leaks billing text).
    // Classify into a user-safe AiGenerationError; log a short, redacted line.
    const classified = classifyAiError(err);
    console.error(
      `AI generateContent failed (${classified.code}):`,
      err instanceof Error ? err.name : typeof err,
    );
    throw classified;
  }

  const text = response.text;
  if (!text) {
    throw new AiGenerationError("failed", "AI 응답이 비어 있어요. 잠시 후 다시 시도해주세요.");
  }

  // A malformed JSON / schema mismatch throws ZodError here (intentionally NOT
  // wrapped) so the generation guard records it as validation_failed, not error.
  return schema.parse(JSON.parse(text));
}
