"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateStructured } from "@/features/ai/client";
import { invalidatePromptCache } from "@/features/ai/prompt-service";
import { buildProblemGenerationPrompt } from "@/features/ai/prompts/problem-generation";
import { aiProblemSetSchema } from "@/features/problems/schema";
import { validatePromptContent } from "@/features/admin/prompt-validation";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { getRequestIp, requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

const createPromptSchema = z.object({
  type: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "타입은 소문자·숫자·밑줄만 사용하세요"),
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  content: z.string(),
});

const saveVersionSchema = z.object({
  promptId: z.string().min(1),
  content: z.string(),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

/** Create a new (custom) prompt type with its first version. */
export async function createPrompt(input: unknown): Promise<Result> {
  const admin = await requireCapability("managePrompts");
  const parsed = createPromptSchema.safeParse(input);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const valid = validatePromptContent(parsed.data.content);
  if (!valid.ok) return { error: valid.error };

  try {
    const existing = await prisma.prompt.findUnique({
      where: { type: parsed.data.type },
    });
    if (existing) return { error: "이미 존재하는 타입입니다." };

    const ip = await getRequestIp();
    const created = await prisma.prompt.create({
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        enabled: true,
        activeVersion: 1,
        versions: {
          create: {
            version: 1,
            content: parsed.data.content,
            note: "최초 버전",
            createdById: admin.id,
            ip,
          },
        },
      },
    });

    invalidatePromptCache(parsed.data.type);
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.PROMPT_CREATE,
      targetType: "prompt",
      targetId: created.id,
      detail: { type: parsed.data.type },
      ip,
    });
    revalidatePath("/admin/prompts");
    return {};
  } catch (err) {
    console.error("[admin] createPrompt failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

/** Save an edit as a NEW version and activate it (never overwrites). */
export async function savePromptVersion(input: unknown): Promise<Result> {
  const admin = await requireCapability("managePrompts");
  const parsed = saveVersionSchema.safeParse(input);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const valid = validatePromptContent(parsed.data.content);
  if (!valid.ok) return { error: valid.error };

  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id: parsed.data.promptId },
    });
    if (!prompt) return { error: "프롬프트를 찾을 수 없습니다." };

    // Two DIFFERENT versions, fetched separately: the next version number
    // must always be highest-existing + 1, but the audit log's "changed"
    // flag must compare against whatever is actually ACTIVE right now — after
    // a rollback those are no longer the same version, so a single "latest
    // version" fetch (the previous bug here) silently mis-tagged every save
    // right after a rollback as "changed" regardless of the real diff.
    const [activeVersionRow, latestVersionRow] = await Promise.all([
      prisma.promptVersion.findUnique({
        where: { promptId_version: { promptId: prompt.id, version: prompt.activeVersion } },
        select: { content: true },
      }),
      prisma.promptVersion.findFirst({
        where: { promptId: prompt.id },
        orderBy: { version: "desc" },
        select: { version: true },
      }),
    ]);
    const activeContent = activeVersionRow?.content;
    const nextVersion = (latestVersionRow?.version ?? 0) + 1;
    const ip = await getRequestIp();

    await prisma.$transaction([
      prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: nextVersion,
          content: parsed.data.content,
          note: parsed.data.note || null,
          createdById: admin.id,
          ip,
        },
      }),
      prisma.prompt.update({
        where: { id: prompt.id },
        data: { activeVersion: nextVersion },
      }),
    ]);

    invalidatePromptCache(prompt.type);
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.PROMPT_SAVE,
      targetType: "prompt",
      targetId: prompt.id,
      detail: {
        type: prompt.type,
        version: nextVersion,
        changed: activeContent !== parsed.data.content,
      },
      ip,
    });
    revalidatePath("/admin/prompts");
    revalidatePath(`/admin/prompts/${prompt.id}`);
    return {};
  } catch (err) {
    console.error("[admin] savePromptVersion failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

/** Re-activate an existing older version (rollback). Does not delete newer
 * versions — they remain in history. */
export async function rollbackPrompt(promptId: string, version: number): Promise<Result> {
  const admin = await requireCapability("managePrompts");

  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) return { error: "프롬프트를 찾을 수 없습니다." };

    const target = await prisma.promptVersion.findUnique({
      where: { promptId_version: { promptId, version } },
    });
    if (!target) return { error: "해당 버전을 찾을 수 없습니다." };

    await prisma.prompt.update({
      where: { id: promptId },
      data: { activeVersion: version },
    });

    invalidatePromptCache(prompt.type);
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.PROMPT_ROLLBACK,
      targetType: "prompt",
      targetId: promptId,
      detail: { type: prompt.type, to: version },
    });
    revalidatePath("/admin/prompts");
    revalidatePath(`/admin/prompts/${promptId}`);
    return {};
  } catch (err) {
    console.error("[admin] rollbackPrompt failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function setPromptEnabled(
  promptId: string,
  enabled: boolean,
): Promise<Result> {
  const admin = await requireCapability("managePrompts");

  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) return { error: "프롬프트를 찾을 수 없습니다." };

    await prisma.prompt.update({ where: { id: promptId }, data: { enabled } });

    invalidatePromptCache(prompt.type);
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.PROMPT_TOGGLE,
      targetType: "prompt",
      targetId: promptId,
      detail: { type: prompt.type, enabled },
    });
    revalidatePath("/admin/prompts");
    revalidatePath(`/admin/prompts/${promptId}`);
    return {};
  } catch (err) {
    console.error("[admin] setPromptEnabled failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function deletePrompt(promptId: string): Promise<Result> {
  const admin = await requireCapability("managePrompts");

  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) return { error: "프롬프트를 찾을 수 없습니다." };

    await prisma.prompt.delete({ where: { id: promptId } });

    invalidatePromptCache(prompt.type);
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.PROMPT_DELETE,
      targetType: "prompt",
      targetId: promptId,
      detail: { type: prompt.type },
    });
    revalidatePath("/admin/prompts");
    return {};
  } catch (err) {
    console.error("[admin] deletePrompt failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

// ─── Prompt test (preview only — never saved or served) ───────────────────────

const testSchema = z.object({
  content: z.string(),
  subjectName: z.string().trim().min(1).max(30),
  unit: z.string().trim().max(50).optional().or(z.literal("")),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER"]),
  count: z.coerce.number().int().min(1).max(5),
});

export type PromptTestResult = { error?: string; output?: string };

/** Run the DRAFT prompt content against the AI with sample problem-generation
 * inputs and return the JSON result for preview. Nothing is persisted. */
export async function testPrompt(input: unknown): Promise<PromptTestResult> {
  await requireCapability("managePrompts");
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return { error: "테스트 입력값이 올바르지 않습니다." };

  const valid = validatePromptContent(parsed.data.content);
  if (!valid.ok) return { error: valid.error };

  try {
    const { problems } = await generateStructured({
      system: parsed.data.content,
      prompt: buildProblemGenerationPrompt({
        subjectName: parsed.data.subjectName,
        unit: parsed.data.unit || undefined,
        difficulty: parsed.data.difficulty,
        type: parsed.data.type,
        count: parsed.data.count,
      }),
      schema: aiProblemSetSchema,
    });
    return { output: JSON.stringify(problems, null, 2) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "테스트 실행에 실패했습니다." };
  }
}
