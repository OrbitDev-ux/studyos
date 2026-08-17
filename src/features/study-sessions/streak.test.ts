import { describe, expect, it } from "vitest";
import { computeStreakStats } from "@/features/study-sessions/streak";

describe("computeStreakStats", () => {
  it("returns all zeros / null when there are no study dates", () => {
    expect(computeStreakStats([], "2026-08-15")).toEqual({
      current: 0,
      longest: 0,
      lastStudyDate: null,
    });
  });

  it("counts a single study day as a streak of 1", () => {
    const result = computeStreakStats(["2026-08-15"], "2026-08-15");
    expect(result).toEqual({ current: 1, longest: 1, lastStudyDate: "2026-08-15" });
  });

  it("counts two consecutive days as a streak of 2", () => {
    const result = computeStreakStats(["2026-08-14", "2026-08-15"], "2026-08-15");
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("still counts yesterday's streak as current when today has no session yet", () => {
    const result = computeStreakStats(["2026-08-13", "2026-08-14"], "2026-08-15");
    expect(result.current).toBe(2);
    expect(result.lastStudyDate).toBe("2026-08-14");
  });

  it("resets current to 0 once a full day is skipped", () => {
    const result = computeStreakStats(["2026-08-10"], "2026-08-15");
    expect(result.current).toBe(0);
  });

  it("breaks a streak on a gap but remembers the longest run", () => {
    // 08-01..08-03 (3-day run), gap, 08-10..08-11 (2-day run), gap to today.
    const result = computeStreakStats(
      ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-10", "2026-08-11"],
      "2026-08-15",
    );
    expect(result.longest).toBe(3);
    expect(result.current).toBe(0);
  });

  it("computes a long unbroken streak ending today", () => {
    const dates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 7, 15 - i));
      return d.toISOString().slice(0, 10);
    });
    const result = computeStreakStats(dates, "2026-08-15");
    expect(result.current).toBe(14);
    expect(result.longest).toBe(14);
  });

  it("de-duplicates multiple sessions on the same day", () => {
    const result = computeStreakStats(
      ["2026-08-15", "2026-08-15", "2026-08-15"],
      "2026-08-15",
    );
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it("longest can exceed current when the best run is in the past", () => {
    const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-08-15"];
    const result = computeStreakStats(dates, "2026-08-15");
    expect(result.current).toBe(1);
    expect(result.longest).toBe(4);
  });
});
