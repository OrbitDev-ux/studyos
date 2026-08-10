"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { Difficulty, QuestionType } from "@/generated/prisma/client";
import { generateStructured } from "@/features/ai/client";
import { getActivePromptContent } from "@/features/ai/prompt-service";
import { PROMPT_TYPES } from "@/features/ai/prompt-registry";
import { buildProblemGenerationPrompt } from "@/features/ai/prompts/problem-generation";
import { buildAnswerExplanationPrompt } from "@/features/ai/prompts/answer-explanation";
import { aiProblemSchema, aiProblemSetSchema } from "@/features/problems/schema";
import { aiExplanationSchema } from "@/features/review/schema";
import {
  generationErrorPayload,
  withGenerationQuota,
  type GenerationErrorPayload,
} from "@/features/ai/generation-guard";
import { accessStateFor, trialStartedDate } from "@/features/billing/access";
import { getStudyBookLearningContext } from "@/features/study-books/learning-context";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser, type CurrentUser } from "@/lib/session";
import { z } from "zod";

/**
 * Per-item AI + management actions for a study book (similar problem, difficulty
 * change, explanation regen, add / weakness-supplement problem, delete, reorder).
 * All reuse the existing stack: real Problem rows, the AI generation guard
 * (kind "problem" → the daily AI-problem quota) with rollback, and ownership
 * scoping. Nothing new in auth / billing / grading is introduced.
 */

type AiProblem = z.infer<typeof aiProblemSchema>;

/** Load an item only if it belongs to the current user's book (authorization). */
async function loadOwnedItem(itemId: string, userId: string) {
  return prisma.studyBookItem.findFirst({
    where: { id: itemId, chapter: { book: { userId } } },
    include: { problem: { include: { choices: true } }, chapter: { include: { book: true } } },
  });
}

async function loadOwnedChapter(chapterId: string, userId: string) {
  return prisma.studyBookChapter.findFirst({
    where: { id: chapterId, book: { userId } },
    include: { book: true },
  });
}

/** Guarded single-problem AI generation (kind "problem"). Throws QuotaError/… */
async function generateOneProblem(
  user: CurrentUser,
  promptText: string,
): Promise<AiProblem> {
  const ip = getClientIp(await headers());
  const { problems } = await withGenerationQuota(
    {
      userId: user.id,
      timezone: user.timezone,
      ip,
      kind: "problem",
      count: 1,
      state: accessStateFor(user),
      trialStartedAt: trialStartedDate(user),
    },
    async () =>
      generateStructured({
        system: await getActivePromptContent(PROMPT_TYPES.PROBLEM_GENERATION),
        prompt: promptText,
        schema: aiProblemSetSchema,
      }),
  );
  const first = problems[0];
  if (!first) throw new Error("문제 생성 결과가 비어 있습니다.");
  return first;
}

/** Create a Problem row (reused model) from an AI problem for a given type. */
async function createBookProblem(
  ctx: { userId: string; subjectId: string | null; unit: string | null },
  type: QuestionType,
  difficulty: Difficulty,
  ai: AiProblem,
): Promise<string> {
  const isMc = type === "MULTIPLE_CHOICE";
  const problem = await prisma.problem.create({
    data: {
      userId: ctx.userId,
      subjectId: ctx.subjectId,
      unit: ctx.unit,
      type,
      difficulty,
      prompt: ai.prompt,
      explanation: ai.explanation,
      answerText: ai.answerText || null,
      scoringCriteria: ai.scoringCriteria || null,
      ...(isMc && ai.choices && ai.choices.length > 0
        ? {
            choices: {
              create: ai.choices.map((c) => ({
                label: c.label,
                content: c.content,
                isCorrect: c.isCorrect,
              })),
            },
          }
        : {}),
    },
    select: { id: true },
  });
  return problem.id;
}

async function nextOrder(chapterId: string): Promise<number> {
  const agg = await prisma.studyBookItem.aggregate({
    where: { chapterId },
    _max: { order: true },
  });
  return (agg._max.order ?? -1) + 1;
}

/** Base prompt for one problem of the book's type/difficulty. */
function baseProblemPrompt(
  book: { subjectName: string; unit: string | null; difficulty: Difficulty; problemType: string },
  difficulty: Difficulty,
): string {
  return buildProblemGenerationPrompt({
    subjectName: book.subjectName,
    unit: book.unit ?? undefined,
    difficulty,
    type: book.problemType as QuestionType,
    count: 1,
  });
}

type ItemResult = { ok?: true } & Partial<GenerationErrorPayload>;

function aiCatch(err: unknown): ItemResult {
  const payload = generationErrorPayload(err);
  if (payload) return payload;
  console.error("study-book item action failed:", err);
  return { error: "AI 요청에 실패했어요. 잠시 후 다시 시도해주세요." };
}

// ── 1. 유사 문제 생성 ────────────────────────────────────────────────────────
export async function generateSimilarProblem(
  bookId: string,
  itemId: string,
): Promise<ItemResult> {
  const user = await requireCurrentUser();
  const item = await loadOwnedItem(itemId, user.id);
  if (!item || !item.problem) throw new Error("문제를 찾을 수 없습니다.");
  const book = item.chapter.book;

  const prompt =
    baseProblemPrompt(book, item.problem.difficulty) +
    `\n\n아래 문제와 핵심 개념·유형은 같게 유지하되 소재/숫자/상황이 다른 새 문제를 만드세요:\n${item.problem.prompt}`;

  try {
    const ai = await generateOneProblem(user, prompt);
    const problemId = await createBookProblem(
      { userId: user.id, subjectId: item.problem.subjectId, unit: item.problem.unit },
      book.problemType as QuestionType,
      item.problem.difficulty,
      ai,
    );
    await prisma.studyBookItem.create({
      data: {
        chapterId: item.chapterId,
        kind: item.kind,
        order: await nextOrder(item.chapterId),
        problemId,
      },
    });
  } catch (err) {
    return aiCatch(err);
  }
  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}

// ── 2. 취약점 보완 문제 추가 ─────────────────────────────────────────────────
export async function addWeaknessProblem(
  bookId: string,
  chapterId: string,
): Promise<ItemResult> {
  const user = await requireCurrentUser();
  const chapter = await loadOwnedChapter(chapterId, user.id);
  if (!chapter) throw new Error("챕터를 찾을 수 없습니다.");
  const book = chapter.book;

  const learning = await getStudyBookLearningContext(user.id, book.subjectId);
  const weakBits = [
    ...learning.weakness.map((w) => w.unit),
    ...learning.wrongConcepts,
  ].slice(0, 5);
  const focus =
    weakBits.length > 0
      ? `\n\n특히 학생이 자주 틀리는 다음 취약 개념을 보완하는 문제로 만드세요: ${weakBits.join(", ")}.`
      : "";

  const prompt = baseProblemPrompt(book, book.difficulty) + focus;

  try {
    const ai = await generateOneProblem(user, prompt);
    const problemId = await createBookProblem(
      { userId: user.id, subjectId: book.subjectId, unit: book.unit },
      book.problemType as QuestionType,
      book.difficulty,
      ai,
    );
    await prisma.studyBookItem.create({
      data: {
        chapterId,
        kind: "practice",
        order: await nextOrder(chapterId),
        problemId,
      },
    });
  } catch (err) {
    return aiCatch(err);
  }
  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}

// ── 3a. 해설 다시 생성 ───────────────────────────────────────────────────────
export async function regenerateItemExplanation(
  bookId: string,
  itemId: string,
): Promise<ItemResult> {
  const user = await requireCurrentUser();
  const item = await loadOwnedItem(itemId, user.id);
  if (!item || !item.problem) throw new Error("문제를 찾을 수 없습니다.");
  const problem = item.problem;

  const correctAnswer =
    problem.type === "MULTIPLE_CHOICE"
      ? (problem.choices.find((c) => c.isCorrect)?.content ?? "")
      : (problem.answerText ?? "");

  const ip = getClientIp(await headers());
  try {
    const { explanation } = await withGenerationQuota(
      {
        userId: user.id,
        timezone: user.timezone,
        ip,
        kind: "problem",
        count: 1,
        state: accessStateFor(user),
        trialStartedAt: trialStartedDate(user),
      },
      async () =>
        generateStructured({
          system: await getActivePromptContent(PROMPT_TYPES.ANSWER_EXPLANATION),
          prompt: buildAnswerExplanationPrompt({ prompt: problem.prompt, correctAnswer }),
          schema: aiExplanationSchema,
          useThinking: true,
        }),
    );
    await prisma.problem.update({
      where: { id: problem.id },
      data: { explanation },
    });
  } catch (err) {
    return aiCatch(err);
  }
  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}

// ── 3b. 난이도 변경 (더 쉽게 / 비슷하게 / 더 어렵게) ─────────────────────────
const DIFF_ORDER: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
function shiftDifficulty(d: Difficulty, dir: "easier" | "similar" | "harder"): Difficulty {
  const i = DIFF_ORDER.indexOf(d);
  if (dir === "easier") return DIFF_ORDER[Math.max(0, i - 1)]!;
  if (dir === "harder") return DIFF_ORDER[Math.min(2, i + 1)]!;
  return d;
}

export async function changeItemDifficulty(
  bookId: string,
  itemId: string,
  direction: "easier" | "similar" | "harder",
): Promise<ItemResult> {
  const user = await requireCurrentUser();
  const item = await loadOwnedItem(itemId, user.id);
  if (!item || !item.problem) throw new Error("문제를 찾을 수 없습니다.");
  const book = item.chapter.book;
  const newDifficulty = shiftDifficulty(item.problem.difficulty, direction);

  const prompt =
    baseProblemPrompt(book, newDifficulty) +
    `\n\n아래 문제와 같은 개념을 다루되 난이도만 조정한 새 문제를 만드세요:\n${item.problem.prompt}`;

  try {
    const ai = await generateOneProblem(user, prompt);
    const problemId = await createBookProblem(
      { userId: user.id, subjectId: item.problem.subjectId, unit: item.problem.unit },
      book.problemType as QuestionType,
      newDifficulty,
      ai,
    );
    // Point the item at the new problem; the old Problem row (and any attempt
    // history) is left intact rather than deleted.
    await prisma.studyBookItem.update({
      where: { id: itemId },
      data: { problemId },
    });
  } catch (err) {
    return aiCatch(err);
  }
  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}

// ── 3c. 문제 추가 (챕터에 일반 문제 1개) ─────────────────────────────────────
export async function addProblemToChapter(
  bookId: string,
  chapterId: string,
): Promise<ItemResult> {
  const user = await requireCurrentUser();
  const chapter = await loadOwnedChapter(chapterId, user.id);
  if (!chapter) throw new Error("챕터를 찾을 수 없습니다.");
  const book = chapter.book;

  try {
    const ai = await generateOneProblem(user, baseProblemPrompt(book, book.difficulty));
    const problemId = await createBookProblem(
      { userId: user.id, subjectId: book.subjectId, unit: book.unit },
      book.problemType as QuestionType,
      book.difficulty,
      ai,
    );
    await prisma.studyBookItem.create({
      data: { chapterId, kind: "practice", order: await nextOrder(chapterId), problemId },
    });
  } catch (err) {
    return aiCatch(err);
  }
  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}

// ── 4a. 문제/아이템 삭제 ─────────────────────────────────────────────────────
export async function deleteBookItem(bookId: string, itemId: string): Promise<void> {
  const user = await requireCurrentUser();
  // Ownership enforced via the nested book.userId filter.
  await prisma.studyBookItem.deleteMany({
    where: { id: itemId, chapter: { book: { userId: user.id } } },
  });
  revalidatePath(`/study-books/${bookId}`);
}

// ── 4b. 순서 변경 (위/아래로) ────────────────────────────────────────────────
export async function moveBookItem(
  bookId: string,
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  const user = await requireCurrentUser();
  const item = await loadOwnedItem(itemId, user.id);
  if (!item) return;

  const siblings = await prisma.studyBookItem.findMany({
    where: { chapterId: item.chapterId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const idx = siblings.findIndex((s) => s.id === itemId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const a = siblings[idx]!;
  const b = siblings[swapIdx]!;
  await prisma.$transaction([
    prisma.studyBookItem.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.studyBookItem.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath(`/study-books/${bookId}`);
}
