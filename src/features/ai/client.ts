import { GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-3.6-flash";

/**
 * All AI-backed features call through here instead of the SDK directly, so a
 * model swap or a retry/logging policy only ever needs to change this file.
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
  const response = await ai.models.generateContent({
    model: MODEL,
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
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  return schema.parse(JSON.parse(text));
}
