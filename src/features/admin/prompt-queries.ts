import { ensurePromptsSeeded } from "@/features/ai/prompt-service";
import { prisma } from "@/lib/prisma";

export type PromptListRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  enabled: boolean;
  activeVersion: number;
  versionCount: number;
  updatedAt: Date;
};

export async function getPrompts(query?: string): Promise<PromptListRow[]> {
  // Seed built-ins from code defaults on first access so the list is never
  // empty and existing prompts are preserved as v1.
  await ensurePromptsSeeded();

  const q = query?.trim().toLowerCase();
  const prompts = await prisma.prompt.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { versions: true } } },
  });

  return prompts
    .filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    )
    .map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      description: p.description,
      enabled: p.enabled,
      activeVersion: p.activeVersion,
      versionCount: p._count.versions,
      updatedAt: p.updatedAt,
    }));
}

export type PromptVersionRow = {
  id: string;
  version: number;
  content: string;
  note: string | null;
  createdByName: string | null;
  ip: string | null;
  createdAt: Date;
  isActive: boolean;
};

export type PromptDetail = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  enabled: boolean;
  activeVersion: number;
  activeContent: string;
  createdAt: Date;
  updatedAt: Date;
  versions: PromptVersionRow[];
};

export async function getPromptDetail(id: string): Promise<PromptDetail | null> {
  const prompt = await prisma.prompt.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
      },
    },
  });
  if (!prompt) return null;

  const active = prompt.versions.find((v) => v.version === prompt.activeVersion);

  return {
    id: prompt.id,
    type: prompt.type,
    title: prompt.title,
    description: prompt.description,
    enabled: prompt.enabled,
    activeVersion: prompt.activeVersion,
    activeContent: active?.content ?? "",
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
    versions: prompt.versions.map((v) => ({
      id: v.id,
      version: v.version,
      content: v.content,
      note: v.note,
      createdByName: v.createdBy?.name ?? v.createdBy?.email ?? null,
      ip: v.ip,
      createdAt: v.createdAt,
      isActive: v.version === prompt.activeVersion,
    })),
  };
}
