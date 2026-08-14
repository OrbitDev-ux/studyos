import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  longestTrueRun,
  type AchievementId,
  type LearningStats,
} from "@/features/achievements/config";
import { ACHIEVEMENT_COPY } from "@/features/achievements/copy";

const ZERO: LearningStats = {
  studySessions: 0,
  studyStreak: 0,
  problemsSolved: 0,
  bestCorrectStreak: 0,
  reviewsCompleted: 0,
  reviewsGraduated: 0,
  totalWrongAnswers: 0,
  dueReviews: 0,
};

function earnedIds(stats: LearningStats): AchievementId[] {
  return evaluateAchievements(stats)
    .filter((a) => a.earned)
    .map((a) => a.id);
}

describe("longestTrueRun", () => {
  it("finds the longest consecutive run", () => {
    expect(longestTrueRun([])).toBe(0);
    expect(longestTrueRun([true, true, false, true])).toBe(2);
    expect(longestTrueRun([false, true, true, true, false, true])).toBe(3);
  });
});

describe("evaluateAchievements", () => {
  it("earns nothing for a brand-new user", () => {
    expect(earnedIds(ZERO)).toEqual([]);
  });

  it("earns streak tiers cumulatively", () => {
    expect(earnedIds({ ...ZERO, studySessions: 1, studyStreak: 7 })).toEqual(
      expect.arrayContaining(["FIRST_STUDY", "STUDY_STREAK_3", "STUDY_STREAK_7"]),
    );
    expect(earnedIds({ ...ZERO, studyStreak: 7 })).not.toContain("STUDY_STREAK_30");
  });

  it("earns PERFECT_10 only at a 10 correct streak", () => {
    expect(earnedIds({ ...ZERO, bestCorrectStreak: 9 })).not.toContain("PERFECT_10");
    expect(earnedIds({ ...ZERO, bestCorrectStreak: 10 })).toContain("PERFECT_10");
  });

  it("REVIEW_MASTER needs wrong answers and zero due", () => {
    expect(earnedIds({ ...ZERO, totalWrongAnswers: 0, dueReviews: 0 })).not.toContain(
      "REVIEW_MASTER",
    );
    expect(earnedIds({ ...ZERO, totalWrongAnswers: 5, dueReviews: 0 })).toContain(
      "REVIEW_MASTER",
    );
    expect(earnedIds({ ...ZERO, totalWrongAnswers: 5, dueReviews: 2 })).not.toContain(
      "REVIEW_MASTER",
    );
  });
});

describe("achievement copy", () => {
  it("covers every achievement id in every locale", () => {
    for (const copy of Object.values(ACHIEVEMENT_COPY)) {
      for (const def of ACHIEVEMENTS) {
        expect(copy.items[def.id]?.title).toBeTruthy();
        expect(copy.items[def.id]?.description).toBeTruthy();
      }
    }
  });
});
