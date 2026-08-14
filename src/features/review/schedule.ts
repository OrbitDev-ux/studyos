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

/**
 * ── 적응형 복습 (Phase 6) ──────────────────────────────────────────────────
 * The fixed ladder above is the anchor; a per-item `easeFactor` (SM-2 style)
 * personalizes it. A review outcome maps to a grade; the grade nudges the ease
 * and scales the next interval. Design guarantee: `scheduleWithGrade(stage,
 * DEFAULT_EASE, "good")` reproduces `scheduleAfterSuccess(stage)` exactly, so
 * existing schedules (ease defaulted to 2.5) are unchanged until a non-"good"
 * outcome drifts the ease.
 */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;

/** Ease nudge per grade. "good" is neutral (keeps continuity); lapses/hard drop
 * it (shorter future intervals), "easy" raises it (longer). */
const EASE_DELTA: Record<ReviewGrade, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** Interval multiplier per (non-lapse) grade, on top of the base ladder step. */
const GRADE_INTERVAL_FACTOR: Record<Exclude<ReviewGrade, "again">, number> = {
  hard: 0.6,
  good: 1,
  easy: 1.3,
};

export function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

export function nextEase(ease: number, grade: ReviewGrade): number {
  return clampEase(Math.round((ease + EASE_DELTA[grade]) * 100) / 100);
}

export type AdaptiveSchedule = {
  reviewStage: number;
  easeFactor: number;
  nextReviewAt: Date | null;
  graduated: boolean;
};

/**
 * Next schedule for an item at `currentStage`/`ease` given a review `grade`.
 * - "again": lapse — reset to stage 0, due after the first interval, ease down.
 * - "hard"/"good"/"easy": advance one stage; interval = base ladder step ×
 *   grade factor × (ease / DEFAULT_EASE). Passing the last step graduates it.
 */
export function scheduleWithGrade(
  currentStage: number,
  ease: number,
  grade: ReviewGrade,
  now: Date = new Date(),
): AdaptiveSchedule {
  const easeFactor = nextEase(ease, grade);

  if (grade === "again") {
    const days = REVIEW_INTERVALS_DAYS[0]!;
    return {
      reviewStage: 0,
      easeFactor,
      nextReviewAt: new Date(now.getTime() + days * DAY_MS),
      graduated: false,
    };
  }

  const newStage = currentStage + 1;
  if (newStage >= REVIEW_INTERVALS_DAYS.length) {
    return { reviewStage: newStage, easeFactor, nextReviewAt: null, graduated: true };
  }

  const base = REVIEW_INTERVALS_DAYS[newStage]!;
  const days = Math.max(
    1,
    Math.round(base * GRADE_INTERVAL_FACTOR[grade] * (easeFactor / DEFAULT_EASE)),
  );
  return {
    reviewStage: newStage,
    easeFactor,
    nextReviewAt: new Date(now.getTime() + days * DAY_MS),
    graduated: false,
  };
}
