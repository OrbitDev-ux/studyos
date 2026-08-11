import { GeminiProvider } from "@/features/ai/providers/gemini";
import { GroqProvider } from "@/features/ai/providers/groq";
import type { AIProvider } from "@/features/ai/providers/types";

export type { AIProvider, GenerateInput } from "@/features/ai/providers/types";

export type ProviderName = "groq" | "gemini";

/**
 * Which AI provider to use, from AI_PROVIDER. Defaults to "groq" (current
 * provider), with "gemini" one env flip away for when a valid Gemini key exists.
 */
export function activeProviderName(): ProviderName {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "gemini" ? "gemini" : "groq";
}

const instances: Record<ProviderName, AIProvider> = {
  groq: new GroqProvider(),
  gemini: new GeminiProvider(),
};

export function getProvider(): AIProvider {
  return instances[activeProviderName()];
}
