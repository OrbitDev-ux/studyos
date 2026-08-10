import "server-only";
import type { Difficulty, Prisma } from "@/generated/prisma/client";
import { generateStructured } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import {
  buildChapterRegenPrompt,
  buildStudyBookPrompt,
  type StudyBookPromptInput,
} from "@/features/ai/prompts/study-book-generation";
import { withGenerationQuota } from "@/features/ai/generation-guard";
import type { AccessState } from "@/features/billing/subscription";
import { aiBookSchema, type AiBookChapter } from "@/features/study-books/schema";
import { prisma } from "@/lib/prisma";

/**
 * Study-book generation + persistence. Reuses generateStructured (AI), the
 * generation guard (quota/advisory-lock/rollback), and the existing Problem
 * model (problem items reference real Problem rows — no duplication). Nothing
 * here trusts the client; the caller resolves plan/subject server-side.
 */

type GuardCtx = {
  userId: string;
  timezone: string;
  ip: string | null;
  state: AccessState;
  trialStartedAt: Date | null;
};

/** Map a problem's tier to a stored Difficulty (advanced bumps to HARD). */
function tierDifficulty(bookDifficulty: Difficulty, tier: string): Difficulty {
  return tier === "advanced" ? "HARD" : bookDifficulty;
}

/**
 * Run the guarded AI call and return validated chapters. Over-quota throws
 * (FeatureLimitError / QuotaError) BEFORE any AI call; a failed/invalid AI call
 * does not consume the user's book quota (guard marks error, not success).
 */
export async function generateBookChapters(
  guard: GuardCtx,
  promptInput: StudyBookPromptInput,
  opts: { regenChapterTitle?: string } = {},
): Promise<AiBookChapter[]> {
  const prompt = opts.regenChapterTitle
    ? buildChapterRegenPrompt({ ...promptInput, chapterTitle: opts.regenChapterTitle })
    : buildStudyBookPrompt(promptInput);

  const { chapters } = await withGenerationQuota(
    { ...guard, kind: "study-book", count: promptInput.chapterCount },
    async () =>
      generateStructured({
        system: await getActivePromptContent(PROMPT_TYPES.STUDY_BOOK_GENERATION),
        prompt,
        schema: aiBookSchema,
        useThinking: true,
        // Book generation is far heavier than a single problem set: the shared
        // 30s default aborts it mid-generation. Give it a long single-shot
        // window (no retry) that still stays under the serverless function
        // limit; generation size is capped in the form schema to fit this.
        timeoutMs: 50_000,
        retryAttempts: 1,
      }),
  );
  return chapters;
}

/** Build the nested chapter/item/problem create payload for one AI chapter. */
function chapterCreateData(
  chapter: AiBookChapter,
  order: number,
  ctx: { userId: string; subjectId: string; unit: string | null; difficulty: Difficulty },
): Prisma.StudyBookChapterCreateWithoutBookInput {
  const items: Prisma.StudyBookItemCreateWithoutChapterInput[] = [];
  let itemOrder = 0;

  for (const example of chapter.examples ?? []) {
    items.push({ kind: "example", order: itemOrder++, content: example });
  }

  for (const problem of chapter.problems) {
    const isMc = !!problem.choices && problem.choices.length > 0;
    items.push({
      kind: problem.tier,
      order: itemOrder++,
      // Reuse the Problem model — the problem is a real, owned Problem row.
      problem: {
        create: {
          userId: ctx.userId,
          subjectId: ctx.subjectId,
          unit: ctx.unit,
          type: isMc ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
          difficulty: tierDifficulty(ctx.difficulty, problem.tier),
          prompt: problem.prompt,
          explanation: problem.explanation,
          answerText: problem.answerText || null,
          ...(isMc
            ? {
                choices: {
                  create: problem.choices!.map((c) => ({
                    label: c.label,
                    content: c.content,
                    isCorrect: c.isCorrect,
                  })),
                },
              }
            : {}),
        },
      },
    });
  }

  return {
    title: chapter.title,
    order,
    concept: chapter.concept,
    reviewPoints: chapter.reviewPoints || null,
    items: { create: items },
  };
}

export type PersistBookInput = {
  userId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  grade: string;
  unit: string | null;
  difficulty: Difficulty;
  type: string;
  customInstructions: string | null;
  chapters: AiBookChapter[];
};

/** Create the whole book (chapters + items + reused Problem rows) atomically. */
export async function persistNewBook(input: PersistBookInput): Promise<string> {
  const book = await prisma.studyBook.create({
    data: {
      userId: input.userId,
      title: input.title,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      grade: input.grade,
      unit: input.unit,
      difficulty: input.difficulty,
      type: input.type,
      customInstructions: input.customInstructions,
      status: "ready",
      chapters: {
        create: input.chapters.map((chapter, i) =>
          chapterCreateData(chapter, i, {
            userId: input.userId,
            subjectId: input.subjectId,
            unit: input.unit,
            difficulty: input.difficulty,
          }),
        ),
      },
    },
    select: { id: true },
  });
  return book.id;
}

/** Replace a single chapter's content in place (chapter-scoped regeneration). */
export async function replaceChapterContent(
  chapterId: string,
  order: number,
  chapter: AiBookChapter,
  ctx: { userId: string; subjectId: string; unit: string | null; difficulty: Difficulty },
): Promise<void> {
  const data = chapterCreateData(chapter, order, ctx);
  await prisma.$transaction([
    // Old items are removed; their reused Problem rows are left in place
    // (SetNull) so any existing attempt history on them is preserved.
    prisma.studyBookItem.deleteMany({ where: { chapterId } }),
    prisma.studyBookChapter.update({
      where: { id: chapterId },
      data: {
        title: data.title,
        concept: data.concept,
        reviewPoints: data.reviewPoints,
        items: data.items,
      },
    }),
  ]);
}
