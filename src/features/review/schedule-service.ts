import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  scheduleAfterSuccess,
  scheduleForNewWrong,
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
      },
    });
  } catch (err) {
    // Existing row (unique userId+problemId): re-open and reset the schedule,
    // but never overwrite `source` (it records where the wrong first came from).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await prisma.wrongAnswer.update({
        where: { userId_problemId: { userId, problemId } },
        data: {
          resolved: false,
          reviewStage: s.reviewStage,
          nextReviewAt: s.nextReviewAt,
          lastReviewedAt: now,
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
): Promise<{ graduated: boolean; reviewStage: number } | null> {
  const existing = await prisma.wrongAnswer.findFirst({
    where: { userId, problemId, resolved: false },
    select: { id: true, reviewStage: true },
  });
  if (!existing) return null;

  const s = scheduleAfterSuccess(existing.reviewStage, now);
  await prisma.wrongAnswer.update({
    where: { id: existing.id },
    data: {
      reviewStage: s.reviewStage,
      nextReviewAt: s.nextReviewAt,
      lastReviewedAt: now,
      resolved: s.graduated,
    },
  });
  return { graduated: s.graduated, reviewStage: s.reviewStage };
}
