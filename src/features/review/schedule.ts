/**
 * 자동 복습 (Phase 5) — pure spaced-repetition scheduling. No DB/imports so it
 * can be unit-tested in isolation; the service layer (schedule-service.ts)
 * applies these results to WrongAnswer rows.
 *
 * A wrong answer starts at stage 0 and becomes due after REVIEW_INTERVALS_DAYS[0]
 * days. Each successful review advances the stage (next interval); a wrong
 * review resets it to 0. Passing the last interval graduates the item (it is
 * marked resolved and drops out of the review queue).
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewSchedule = {
  reviewStage: number;
  nextReviewAt: Date | null;
  graduated: boolean;
};

/**
 * The schedule for an item that now has `stage` successful reviews. stage 0 is
 * a freshly-registered (or reset) wrong answer. When stage reaches the number
 * of intervals, the item graduates (no further reviews).
 */
export function scheduleForStage(stage: number, now: Date = new Date()): ReviewSchedule {
  if (stage >= REVIEW_INTERVALS_DAYS.length) {
    return { reviewStage: stage, nextReviewAt: null, graduated: true };
  }
  // Safe: the guard above guarantees stage is a valid index.
  const days = REVIEW_INTERVALS_DAYS[stage]!;
  return {
    reviewStage: stage,
    nextReviewAt: new Date(now.getTime() + days * DAY_MS),
    graduated: false,
  };
}

/** Schedule for a newly wrong (or re-wrong) answer: reset to stage 0. */
export function scheduleForNewWrong(now: Date = new Date()): ReviewSchedule {
  return scheduleForStage(0, now);
}

/** Schedule after a successful review from a given current stage: advance one. */
export function scheduleAfterSuccess(currentStage: number, now: Date = new Date()): ReviewSchedule {
  return scheduleForStage(currentStage + 1, now);
}

/** Is an item with this nextReviewAt due for review at `now`? Null = due. */
export function isDue(nextReviewAt: Date | null, now: Date = new Date()): boolean {
  return nextReviewAt === null || nextReviewAt.getTime() <= now.getTime();
}
