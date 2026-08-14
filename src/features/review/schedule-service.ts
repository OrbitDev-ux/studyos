import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_EASE,
  nextEase,
  scheduleForNewWrong,
  scheduleWithGrade,
  type ReviewGrade,
} from "@/features/review/schedule";

/**
 * Register (or re-open) a wrong answer into the spaced-repetition schedule.
 * Resets the item to stage 0, due after the first interval. Replaces the old
 * ad-hoc "insert WrongAnswer / set resolved=false" logic in the submission
 * paths so the schedule is always consistent. Preserves the existing
 * source-not-overwritten-on-conflict behaviour.
 */
export async function registerWrongAnswerForReview(
  userId: string,
  problemId: string,
  source: string,
  now: Date = new Date(),
): Promise<void> {
  const s = scheduleForNewWrong(now);
  try {
    await prisma.wrongAnswer.create({
      data: {
        userId,
        problemId,
        source,
        resolved: false,
        reviewStage: s.reviewStage,
        nextReviewAt: s.nextReviewAt,
        easeFactor: DEFAULT_EASE,
      },
    });
  } catch (err) {
    // Existing row (unique userId+problemId): re-open and reset the schedule,
    // but never overwrite `source` (it records where the wrong first came from).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // A repeat lapse ("again"): reset the stage and drop the ease so this
      // stubborn item keeps shorter intervals going forward.
      const existing = await prisma.wrongAnswer.findUnique({
        where: { userId_problemId: { userId, problemId } },
        select: { easeFactor: true },
      });
      await prisma.wrongAnswer.update({
        where: { userId_problemId: { userId, problemId } },
        data: {
          resolved: false,
          reviewStage: s.reviewStage,
          nextReviewAt: s.nextReviewAt,
          lastReviewedAt: now,
          easeFactor: nextEase(existing?.easeFactor ?? DEFAULT_EASE, "again"),
        },
      });
      return;
    }
    throw err;
  }
}

/**
 * Record a successful review of a problem. If an unresolved WrongAnswer exists,
 * advance its stage: either schedule the next interval or graduate it (resolved
 * = true, no next review). A no-op when there's no unresolved wrong answer
 * (e.g. a first correct attempt on a fresh problem).
 *
 * Returns what happened so callers/UI can reflect it, or null if nothing to do.
 */
export async function recordReviewSuccess(
  userId: string,
  problemId: string,
  now: Date = new Date(),
  grade: Exclude<ReviewGrade, "again"> = "good",
): Promise<{ graduated: boolean; reviewStage: number } | null> {
  const existing = await prisma.wrongAnswer.findFirst({
    where: { userId, problemId, resolved: false },
    select: { id: true, reviewStage: true, easeFactor: true },
  });
  if (!existing) return null;

  const s = scheduleWithGrade(existing.reviewStage, existing.easeFactor, grade, now);
  await prisma.wrongAnswer.update({
    where: { id: existing.id },
    data: {
      reviewStage: s.reviewStage,
      easeFactor: s.easeFactor,
      nextReviewAt: s.nextReviewAt,
      lastReviewedAt: now,
      resolved: s.graduated,
    },
  });
  return { graduated: s.graduated, reviewStage: s.reviewStage };
}

/**
 * Apply an explicit review grade (다시/어려움/보통/쉬움) to a specific wrong
 * answer the user owns. Used by the review UI's self-assessment buttons and by
 * the Tutor→SRS integration. Ownership + unresolved state are enforced here;
 * the grade string is validated by the caller (server action) against
 * ReviewGrade before reaching this service.
 */
export async function gradeReviewById(
  userId: string,
  wrongAnswerId: string,
  grade: ReviewGrade,
  now: Date = new Date(),
): Promise<{ graduated: boolean; reviewStage: number } | null> {
  const existing = await prisma.wrongAnswer.findFirst({
    where: { id: wrongAnswerId, userId },
    select: { id: true, reviewStage: true, easeFactor: true, resolved: true },
  });
  if (!existing) return null;

  const s = scheduleWithGrade(existing.reviewStage, existing.easeFactor, grade, now);
  await prisma.wrongAnswer.update({
    where: { id: existing.id },
    data: {
      reviewStage: s.reviewStage,
      easeFactor: s.easeFactor,
      nextReviewAt: s.nextReviewAt,
      lastReviewedAt: now,
      // A lapse re-opens a graduated item; any advance may graduate it.
      resolved: s.graduated,
    },
  });
  return { graduated: s.graduated, reviewStage: s.reviewStage };
}
