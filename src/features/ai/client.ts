import { GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";
import { getAllSettings } from "@/lib/admin/settings";

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
}: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  /** Enable thinking for reasoning-heavy tasks (analysis, explanations). */
  useThinking?: boolean;
}): Promise<T> {
  const { aiEnabled, aiModel } = await getAllSettings();
  if (!aiEnabled) {
    throw new Error("AI 기능이 관리자에 의해 비활성화되어 있습니다.");
  }

  const response = await ai.models.generateContent({
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
        timeout: 30_000,
        retryOptions: { attempts: 2 },
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  return schema.parse(JSON.parse(text));
}
