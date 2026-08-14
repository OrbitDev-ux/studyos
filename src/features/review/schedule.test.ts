import { describe, expect, it } from "vitest";
import {
  DEFAULT_EASE,
  REVIEW_INTERVALS_DAYS,
  nextEase,
  scheduleAfterSuccess,
  scheduleWithGrade,
} from "@/features/review/schedule";

const NOW = new Date("2026-08-14T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(date: Date | null): number | null {
  return date === null ? null : Math.round((date.getTime() - NOW.getTime()) / DAY_MS);
}

describe("scheduleWithGrade", () => {
  it("with default ease + 'good' reproduces the legacy fixed ladder", () => {
    // Migration-safe: existing rows (ease 2.5) advancing on 'good' land exactly
    // where scheduleAfterSuccess used to put them.
    for (let stage = 0; stage < REVIEW_INTERVALS_DAYS.length; stage++) {
      const adaptive = scheduleWithGrade(stage, DEFAULT_EASE, "good", NOW);
      const legacy = scheduleAfterSuccess(stage, NOW);
      expect(adaptive.reviewStage).toBe(legacy.reviewStage);
      expect(adaptive.graduated).toBe(legacy.graduated);
      expect(daysUntil(adaptive.nextReviewAt)).toBe(daysUntil(legacy.nextReviewAt));
    }
  });

  it("graduates after passing the last interval", () => {
    const last = REVIEW_INTERVALS_DAYS.length - 1;
    const s = scheduleWithGrade(last, DEFAULT_EASE, "good", NOW);
    expect(s.graduated).toBe(true);
    expect(s.nextReviewAt).toBeNull();
  });

  it("'again' resets to stage 0 with a short interval and lower ease", () => {
    const s = scheduleWithGrade(3, DEFAULT_EASE, "again", NOW);
    expect(s.reviewStage).toBe(0);
    expect(s.graduated).toBe(false);
    expect(daysUntil(s.nextReviewAt)).toBe(REVIEW_INTERVALS_DAYS[0]);
    expect(s.easeFactor).toBeLessThan(DEFAULT_EASE);
  });

  it("'easy' schedules a longer interval than 'good', 'hard' shorter", () => {
    const stage = 2;
    const hard = daysUntil(scheduleWithGrade(stage, DEFAULT_EASE, "hard", NOW).nextReviewAt)!;
    const good = daysUntil(scheduleWithGrade(stage, DEFAULT_EASE, "good", NOW).nextReviewAt)!;
    const easy = daysUntil(scheduleWithGrade(stage, DEFAULT_EASE, "easy", NOW).nextReviewAt)!;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("lower ease shortens intervals for the same grade", () => {
    const stage = 2;
    const lowEase = daysUntil(scheduleWithGrade(stage, 1.5, "good", NOW).nextReviewAt)!;
    const defEase = daysUntil(scheduleWithGrade(stage, DEFAULT_EASE, "good", NOW).nextReviewAt)!;
    expect(lowEase).toBeLessThan(defEase);
  });

  it("never schedules less than 1 day ahead for an advance", () => {
    const s = scheduleWithGrade(0, 1.3, "hard", NOW);
    expect(daysUntil(s.nextReviewAt)).toBeGreaterThanOrEqual(1);
  });
});

describe("nextEase", () => {
  it("is neutral for 'good' and clamps to the valid range", () => {
    expect(nextEase(DEFAULT_EASE, "good")).toBe(DEFAULT_EASE);
    expect(nextEase(1.3, "again")).toBeGreaterThanOrEqual(1.3);
    expect(nextEase(3.0, "easy")).toBeLessThanOrEqual(3.0);
  });
});
