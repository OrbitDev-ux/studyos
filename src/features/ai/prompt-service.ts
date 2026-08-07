import { prisma } from "@/lib/prisma";
import {
  PROMPT_DEFINITIONS,
  PROMPT_REGISTRY,
  getPromptDefinition,
} from "@/features/ai/prompt-registry";

// In-memory prompt cache. Prompts change rarely but are read on every AI call,
// so we cache the active content per server instance with a short TTL (edits
// on other instances converge within the TTL) and invalidate locally on write
// for immediate effect on the editing instance.
const CACHE_TTL_MS = 60_000;
type CacheEntry = { content: string; at: number };
const cache = new Map<string, CacheEntry>();

async function loadActiveContent(type: string): Promise<string> {
  const prompt = await prisma.prompt.findUnique({ where: { type } });
  if (prompt && prompt.enabled) {
    const active = await prisma.promptVersion.findUnique({
      where: { promptId_version: { promptId: prompt.id, version: prompt.activeVersion } },
    });
    if (active) return active.content;
  }
  // Safe fallback: the built-in default keeps the AI working even before the
  // prompt has been seeded, or if it was disabled/deleted.
  return getPromptDefinition(type)?.defaultContent ?? "";
}

/** The prompt content the AI engine must use for `type`. Cached; never reads a
 * hard-coded constant at the call site — always the active DB version (or the
 * registered default as a fallback). */
export async function getActivePromptContent(type: string): Promise<string> {
  const cached = cache.get(type);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.content;

  const content = await loadActiveContent(type);
  cache.set(type, { content, at: Date.now() });
  return content;
}

/** Drop the cache so the next read reflects a just-saved edit immediately. */
export function invalidatePromptCache(type?: string): void {
  if (type) cache.delete(type);
  else cache.clear();
}

/**
 * Ensure every built-in prompt has a DB row + initial version. Idempotent —
 * only creates what's missing, so it's safe to call on each admin page load.
 * Seeds from the registry defaults, preserving the exact prompts the app
 * shipped with as v1.
 */
export async function ensurePromptsSeeded(): Promise<void> {
  const existing = await prisma.prompt.findMany({ select: { type: true } });
  const existingTypes = new Set(existing.map((p) => p.type));

  const missing = PROMPT_REGISTRY.filter((def) => !existingTypes.has(def.type));
  if (missing.length === 0) return;

  await prisma.$transaction(
    missing.map((def) =>
      prisma.prompt.create({
        data: {
          type: def.type,
          title: def.title,
          description: def.description,
          enabled: true,
          activeVersion: 1,
          versions: {
            create: {
              version: 1,
              content: def.defaultContent,
              note: "초기 버전 (코드 기본값)",
            },
          },
        },
      }),
    ),
  );
}

export { PROMPT_DEFINITIONS };
