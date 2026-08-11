import { GeminiProvider } from "@/features/ai/providers/gemini";
import { ManusProvider } from "@/features/ai/providers/manus";
import type { AIProvider } from "@/features/ai/providers/types";

export type { AIProvider, GenerateInput } from "@/features/ai/providers/types";

export type ProviderName = "manus" | "gemini";

/**
 * Which AI provider to use, from AI_PROVIDER. Defaults to "manus" (current
 * release), with "gemini" one env flip away for when the Gemini key is valid.
 */
export function activeProviderName(): ProviderName {
  return process.env.AI_PROVIDER?.trim().toLowerCase() === "gemini" ? "gemini" : "manus";
}

const instances: Record<ProviderName, AIProvider> = {
  manus: new ManusProvider(),
  gemini: new GeminiProvider(),
};

export function getProvider(): AIProvider {
  return instances[activeProviderName()];
}
