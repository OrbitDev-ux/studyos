"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { resolveTaxonomy } from "@/features/curriculum/taxonomy";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import {
  generationErrorPayload,
  type GenerationErrorPayload,
} from "@/features/ai/generation-guard";
import { accessStateFor, trialStartedDate } from "@/features/billing/access";
import {
  studyBookFormSchema,
  studyBookUpdateSchema,
  type StudyBookFormValues,
  type StudyBookUpdateValues,
} from "@/features/study-books/schema";
import { isWrongReviewType, studyBookTypeLabel } from "@/features/study-books/types";
import { questionTypeInstruction } from "@/features/ai/prompts/problem-generation";
import type { QuestionType } from "@/generated/prisma/client";
import { getStudyBookLearningContext } from "@/features/study-books/learning-context";
import {
  generateBookChapters,
  persistNewBook,
  replaceChapterContent,
} from "@/features/study-books/generate";
import type { StudyBookPromptInput } from "@/features/ai/prompts/study-book-generation";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import type { CurrentUser } from "@/lib/session";

/** Find-or-create the user's Subject row for a canonical subject name. */
async function resolveSubject(userId: string, subjectName: string) {
  const defaultColor = DEFAULT_SUBJECTS.find((s) => s.name === subjectName)?.color;
  return prisma.subject.upsert({
    where: { userId_name: { userId, name: subjectName } },
    create: { userId, name: subjectName, color: defaultColor ?? SUBJECT_COLOR_PALETTE[0] },
    update: {},
  });
}

function guardCtx(user: CurrentUser, ip: string | null) {
  return {
    userId: user.id,
    timezone: user.timezone,
    ip,
    state: accessStateFor(user),
    trialStartedAt: trialStartedDate(user),
  };
}

/**
 * Generate and persist a new study book. Server is authoritative: taxonomy is
 * re-validated, the plan/trial entitlement is enforced by the generation guard
 * (over-quota → structured payload, no AI call), and the personal instructions
 * are passed to the AI only inside the untrusted user block (never overriding
 * system rules).
 */
export async function createStudyBook(
  values: StudyBookFormValues,
): Promise<{ bookId?: string } & Partial<GenerationErrorPayload>> {
  const user = await requireCurrentUser();
  // Server-authoritative validation (see problems/actions). Caps chapter/문항 수
  // (챕터 최대 4 × 챕터당 최대 5) with a clear message instead of a masked throw.
  const validation = studyBookFormSchema.safeParse(values);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  const parsed = validation.data;

  const resolved = resolveTaxonomy({
    gradeId: parsed.gradeId,
    subjectId: parsed.subjectId,
    unitId: parsed.unitId,
  });
  if (!resolved.ok) return { error: resolved.error };
  const { gradeName, subjectName, unitName } = resolved.value;

  const subject = await resolveSubject(user.id, subjectName);
  const learning = await getStudyBookLearningContext(user.id, subject.id);

  const promptInput: StudyBookPromptInput = {
    title: parsed.title,
    subjectName,
    grade: gradeName,
    unit: unitName,
    difficultyLabel: DIFFICULTY_LABEL[parsed.difficulty],
    typeLabel: studyBookTypeLabel(parsed.type),
    problemTypeInstruction: questionTypeInstruction(parsed.problemType),
    chapterCount: parsed.chapterCount,
    problemsPerChapter: parsed.problemsPerChapter,
    customInstructions: parsed.customInstructions?.trim() || null,
    weakness: learning.weakness,
    wrongConcepts: learning.wrongConcepts,
    isWrongReview: isWrongReviewType(parsed.type),
  };

  const ip = getClientIp(await headers());
  let chapters;
  try {
    chapters = await generateBookChapters(guardCtx(user, ip), promptInput);
  } catch (err) {
    // Quota/limit → structured payload (with upgrade info).
    const payload = generationErrorPayload(err);
    if (payload) return payload;
    // Non-quota failure (AI timeout / model error / off-schema output). Surface
    // an actionable message rather than a generic throw; the form is preserved.
    console.error("study-book generation failed:", err);
    return {
      error: "교재 생성에 실패했어요. 잠시 후 다시 시도하거나 챕터·문항 수를 줄여보세요.",
    };
  }

  const bookId = await persistNewBook({
    userId: user.id,
    title: parsed.title,
    subjectId: subject.id,
    subjectName,
    grade: gradeName,
    unit: unitName,
    difficulty: parsed.difficulty,
    type: parsed.type,
    problemType: parsed.problemType,
    customInstructions: promptInput.customInstructions,
    chapters,
  });

  revalidatePath("/study-books");
  return { bookId };
}

/** Update a book's title and/or personal instructions (owner-scoped). */
export async function updateStudyBook(
  bookId: string,
  values: StudyBookUpdateValues,
): Promise<void> {
  const user = await requireCurrentUser();
  const parsed = studyBookUpdateSchema.parse(values);

  const data: { title?: string; customInstructions?: string | null } = {};
  if (parsed.title !== undefined) data.title = parsed.title;
  if (parsed.customInstructions !== undefined) {
    data.customInstructions = parsed.customInstructions?.trim() || null;
  }
  if (Object.keys(data).length === 0) return;

  // updateMany with userId in the filter enforces ownership (0 rows for others).
  const res = await prisma.studyBook.updateMany({
    where: { id: bookId, userId: user.id },
    data,
  });
  if (res.count === 0) throw new Error("교재를 찾을 수 없습니다.");

  revalidatePath(`/study-books/${bookId}`);
}

/** Delete a book (owner-scoped; cascades to chapters/items). */
export async function deleteStudyBook(bookId: string): Promise<void> {
  const user = await requireCurrentUser();
  await prisma.studyBook.deleteMany({ where: { id: bookId, userId: user.id } });
  revalidatePath("/study-books");
}

/**
 * Regenerate a single chapter in place, reusing the book's stored settings +
 * personal instructions. Owner-scoped and entitlement-guarded like creation.
 */
export async function regenerateChapter(
  bookId: string,
  chapterId: string,
): Promise<{ ok?: true } & Partial<GenerationErrorPayload>> {
  const user = await requireCurrentUser();

  const book = await prisma.studyBook.findFirst({
    where: { id: bookId, userId: user.id },
    include: {
      chapters: {
        where: { id: chapterId },
        select: { id: true, title: true, order: true, _count: { select: { items: true } } },
      },
    },
  });
  if (!book || book.chapters.length === 0) {
    throw new Error("교재 또는 챕터를 찾을 수 없습니다.");
  }
  const chapter = book.chapters[0]!;

  const subject = await resolveSubject(user.id, book.subjectName);
  const learning = await getStudyBookLearningContext(user.id, subject.id);
  const problemsPerChapter = Math.min(Math.max(chapter._count.items || 5, 1), 5);
  const problemType = book.problemType as QuestionType;

  const promptInput: StudyBookPromptInput = {
    title: book.title,
    subjectName: book.subjectName,
    grade: book.grade,
    unit: book.unit,
    difficultyLabel: DIFFICULTY_LABEL[book.difficulty],
    typeLabel: studyBookTypeLabel(book.type),
    problemTypeInstruction: questionTypeInstruction(problemType),
    chapterCount: 1,
    problemsPerChapter,
    customInstructions: book.customInstructions?.trim() || null,
    weakness: learning.weakness,
    wrongConcepts: learning.wrongConcepts,
    isWrongReview: isWrongReviewType(book.type),
  };

  const ip = getClientIp(await headers());
  let chapters;
  try {
    chapters = await generateBookChapters(guardCtx(user, ip), promptInput, {
      regenChapterTitle: chapter.title,
    });
  } catch (err) {
    const payload = generationErrorPayload(err);
    if (payload) return payload;
    throw err;
  }
  const first = chapters[0];
  if (!first) throw new Error("챕터 생성 결과가 비어 있습니다.");

  await replaceChapterContent(chapter.id, chapter.order, first, {
    userId: user.id,
    subjectId: subject.id,
    unit: book.unit,
    difficulty: book.difficulty,
    problemType,
  });

  revalidatePath(`/study-books/${bookId}`);
  return { ok: true };
}
