import { GoogleGenAI } from "@google/genai";
import { AiGenerationError } from "@/features/ai/errors";
import type { AIProvider, GenerateInput } from "@/features/ai/providers/types";

/**
 * Gemini provider — the original synchronous `generateContent` call, unchanged
 * in behavior. Returns the parsed JSON object (generateStructured re-validates
 * it with Zod). Kept selectable via AI_PROVIDER=gemini for when the Gemini key
 * is valid again.
 */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  async generate(input: GenerateInput): Promise<unknown> {
    const response = await this.ai.models.generateContent({
      model: input.model,
      contents: input.prompt,
      config: {
        systemInstruction: input.system,
        responseMimeType: "application/json",
        responseJsonSchema: input.jsonSchema,
        thinkingConfig: input.useThinking ? { thinkingBudget: -1 } : undefined,
        httpOptions: {
          timeout: input.timeoutMs,
          retryOptions: { attempts: input.retryAttempts },
        },
      },
    });
    const text = response.text;
    if (!text) {
      throw new AiGenerationError("failed", "AI 응답이 비어 있어요. 잠시 후 다시 시도해주세요.");
    }
    return JSON.parse(text);
  }
}
