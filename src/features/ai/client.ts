import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";

const anthropic = new Anthropic();

const MODEL = "claude-opus-5";
const DEFAULT_MAX_TOKENS = 16000;

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
  /** Enable adaptive thinking for reasoning-heavy tasks (analysis, explanations). */
  useThinking?: boolean;
}): Promise<T> {
  const response = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    system,
    thinking: useThinking ? { type: "adaptive" } : undefined,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(schema) },
  });

  if (!response.parsed_output) {
    throw new Error("AI 응답을 스키마에 맞게 파싱하지 못했습니다.");
  }

  return response.parsed_output;
}
