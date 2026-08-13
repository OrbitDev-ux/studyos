import { describe, expect, it } from "vitest";
import {
  getLabFeature,
  LAB_FEATURES,
  LAB_FEATURE_KEYS,
  LAB_STATUS_LABEL,
} from "@/features/lab/registry";
import { rankNextLearning } from "@/features/lab/rank";

describe("lab registry", () => {
  it("registers the three initial features with distinct keys", () => {
    expect(LAB_FEATURE_KEYS).toEqual([
      "AI_LEARNING_COACH",
      "NEXT_LEARNING_RECOMMENDATION",
      "AUTO_BOOK_ENHANCEMENT",
    ]);
    expect(new Set(LAB_FEATURE_KEYS).size).toBe(LAB_FEATURES.length);
  });
  it("labels every status and resolves by key", () => {
    for (const f of LAB_FEATURES) expect(LAB_STATUS_LABEL[f.status]).toBeTruthy();
    expect(getLabFeature("AI_LEARNING_COACH")?.name).toBe("AI 학습 코치");
    expect(getLabFeature("NOPE")).toBeUndefined();
  });
  it("only AI features are marked usesAi", () => {
    expect(getLabFeature("AI_LEARNING_COACH")?.usesAi).toBe(true);
    expect(getLabFeature("AUTO_BOOK_ENHANCEMENT")?.usesAi).toBe(true);
    expect(getLabFeature("NEXT_LEARNING_RECOMMENDATION")?.usesAi).toBe(false);
  });
});

describe("rankNextLearning — deterministic priority", () => {
  it("puts due reviews first, then weak units", () => {
    const items = rankNextLearning({
      dueReviewCount: 4,
      weak: [
        { subjectName: "수학", unit: "분수", accuracyPercent: 40, band: "RED" },
        { subjectName: "영어", unit: "문법", accuracyPercent: 55, band: "ORANGE" },
      ],
      recentSubjects: ["과학"],
    });
    expect(items[0]?.kind).toBe("review");
    expect(items[0]?.title).toContain("4");
    expect(items[1]?.kind).toBe("weakness");
    expect(items[1]?.title).toContain("수학");
  });

  it("falls back to 'continue' only when fewer than 3 items and no reviews", () => {
    const items = rankNextLearning({ dueReviewCount: 0, weak: [], recentSubjects: ["국어"] });
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("continue");
    expect(items[0]?.title).toContain("국어");
  });

  it("returns empty when there is nothing to recommend", () => {
    expect(rankNextLearning({ dueReviewCount: 0, weak: [], recentSubjects: [] })).toEqual([]);
  });

  it("caps weak units at three", () => {
    const items = rankNextLearning({
      dueReviewCount: 0,
      weak: Array.from({ length: 5 }, (_, i) => ({
        subjectName: "수학",
        unit: `단원${i}`,
        accuracyPercent: 30 + i,
        band: "RED",
      })),
      recentSubjects: [],
    });
    expect(items.filter((i) => i.kind === "weakness")).toHaveLength(3);
  });
});
