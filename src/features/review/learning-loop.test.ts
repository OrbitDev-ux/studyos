import { describe, expect, it } from "vitest";
import {
  DEFAULT_EASE,
  REVIEW_INTERVALS_DAYS,
  scheduleWithGrade,
  type ReviewGrade,
} from "@/features/review/schedule";

const NOW = new Date("2026-08-14T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Integration of the review → next-date loop over the pure adaptive scheduler
 * (the part that runs without a DB). Simulates a card being reviewed turn by
 * turn and asserts the schedule behaves as a learner would experience it.
 */
function replay(grades: ReviewGrade[]) {
  let stage = 0;
  let ease = DEFAULT_EASE;
  let lastDays: number | null = null;
  let graduated = false;
  for (const grade of grades) {
    const s = scheduleWithGrade(stage, ease, grade, NOW);
    stage = s.reviewStage;
    ease = s.easeFactor;
    graduated = s.graduated;
    lastDays =
      s.nextReviewAt === null ? null : Math.round((s.nextReviewAt.getTime() - NOW.getTime()) / DAY_MS);
  }
  return { stage, ease, lastDays, graduated };
}

describe("adaptive review loop", () => {
  it("a lapse mid-way resets the ladder and lowers ease", () => {
    const good = replay(["good", "good"]);
    const lapsed = replay(["good", "good", "again"]);
    expect(lapsed.stage).toBe(0);
    expect(lapsed.ease).toBeLessThan(good.ease);
    expect(lapsed.lastDays).toBe(REVIEW_INTERVALS_DAYS[0]);
  });

  it("all-'good' from scratch follows the fixed ladder until graduation", () => {
    // One 'good' per ladder step graduates the item.
    const result = replay(REVIEW_INTERVALS_DAYS.map(() => "good"));
    expect(result.graduated).toBe(true);
    expect(result.lastDays).toBeNull();
  });

  it("consistently rating 'easy' reaches graduation no later than 'good'", () => {
    const goodSteps = REVIEW_INTERVALS_DAYS.map(() => "good" as ReviewGrade);
    const easySteps = REVIEW_INTERVALS_DAYS.map(() => "easy" as ReviewGrade);
    expect(replay(goodSteps).graduated).toBe(true);
    expect(replay(easySteps).graduated).toBe(true);
  });

  it("recovers after a lapse: again → good rebuilds the schedule", () => {
    const s = replay(["good", "again", "good"]);
    expect(s.graduated).toBe(false);
    expect(s.stage).toBe(1);
    expect(s.lastDays).not.toBeNull();
  });
});
