import { describe, expect, it } from "vitest";
import {
  getLevelFromXp,
  getLevelProgress,
  totalXpForLevel,
  xpRequiredForLevel,
  XP_PER_LEVEL_STEP,
} from "@/features/growth/level";

describe("xpRequiredForLevel / totalXpForLevel", () => {
  it("level 1 requires 100 XP to clear and starts at 0 cumulative XP", () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("cumulative XP is the running sum of each level's requirement", () => {
    // 1->2: 100, 2->3: 200, 3->4: 300 => reaching level 4 costs 600 total.
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(300);
    expect(totalXpForLevel(4)).toBe(600);
  });

  it("never returns a level below 1 even for a non-positive input", () => {
    expect(xpRequiredForLevel(0)).toBe(XP_PER_LEVEL_STEP);
    expect(totalXpForLevel(0)).toBe(0);
  });
});

describe("getLevelFromXp", () => {
  it("zero XP is level 1", () => {
    expect(getLevelFromXp(0)).toBe(1);
  });

  it("negative XP is clamped to level 1 rather than throwing or going negative", () => {
    expect(getLevelFromXp(-500)).toBe(1);
  });

  it("XP exactly at a level boundary counts as having reached that level", () => {
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(300)).toBe(3);
    expect(getLevelFromXp(99)).toBe(1);
    expect(getLevelFromXp(299)).toBe(2);
  });

  it("matches a brute-force reference implementation across a wide range", () => {
    function bruteForceLevel(xp: number): number {
      let level = 1;
      while (totalXpForLevel(level + 1) <= xp) level++;
      return level;
    }
    for (const xp of [1, 50, 99, 100, 101, 250, 999, 1000, 1001, 5000, 9999, 50_000]) {
      expect(getLevelFromXp(xp)).toBe(bruteForceLevel(xp));
    }
  });

  it("handles very large XP without an unbounded loop (stays correct and fast)", () => {
    const hugeXp = 50_000_000; // ~level 1000
    const start = performance.now();
    const level = getLevelFromXp(hugeXp);
    const elapsedMs = performance.now() - start;
    expect(totalXpForLevel(level)).toBeLessThanOrEqual(hugeXp);
    expect(totalXpForLevel(level + 1)).toBeGreaterThan(hugeXp);
    expect(elapsedMs).toBeLessThan(50);
  });
});

describe("getLevelProgress", () => {
  it("a brand-new user (0 XP) is level 1, 0/100 progress", () => {
    const progress = getLevelProgress(0);
    expect(progress).toEqual({
      level: 1,
      totalXp: 0,
      currentLevelXp: 0,
      xpForNextLevel: 100,
      progressRatio: 0,
    });
  });

  it("XP part-way through a level reports the correct within-level progress", () => {
    // Level 2 spans [100, 300) — 150 total XP is 50 XP into level 2 (of 200 needed).
    const progress = getLevelProgress(150);
    expect(progress.level).toBe(2);
    expect(progress.currentLevelXp).toBe(50);
    expect(progress.xpForNextLevel).toBe(200);
    expect(progress.progressRatio).toBeCloseTo(0.25);
  });

  it("progressRatio is always within [0, 1]", () => {
    for (const xp of [0, 1, 99, 100, 100_000]) {
      const { progressRatio } = getLevelProgress(xp);
      expect(progressRatio).toBeGreaterThanOrEqual(0);
      expect(progressRatio).toBeLessThanOrEqual(1);
    }
  });

  it("is internally consistent with getLevelFromXp for the same input", () => {
    for (const xp of [0, 42, 100, 3000, 123_456]) {
      expect(getLevelProgress(xp).level).toBe(getLevelFromXp(xp));
    }
  });
});
