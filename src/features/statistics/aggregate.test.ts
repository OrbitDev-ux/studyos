import { describe, expect, it } from "vitest";
import {
  bucketSecondsByDay,
  compareToPrevious,
  computeGoalCompletionPercent,
  computeGoalFillPercent,
  countActiveDays,
  groupSecondsBySubject,
  sumDurationSec,
  type SessionRow,
} from "@/features/statistics/aggregate";

const TZ = "Asia/Seoul";

function session(
  startedAt: string,
  durationSec: number,
  subjectId: string | null = null,
): SessionRow {
  return { startedAt: new Date(startedAt), durationSec, subjectId };
}

describe("sumDurationSec", () => {
  it("is 0 for no sessions", () => {
    expect(sumDurationSec([])).toBe(0);
  });

  it("sums a single session", () => {
    expect(sumDurationSec([session("2026-08-15T01:00:00Z", 600)])).toBe(600);
  });

  it("sums multiple sessions", () => {
    const sessions = [
      session("2026-08-15T01:00:00Z", 600),
      session("2026-08-15T03:00:00Z", 300),
    ];
    expect(sumDurationSec(sessions)).toBe(900);
  });
});

describe("bucketSecondsByDay", () => {
  const days = ["2026-08-13", "2026-08-14", "2026-08-15"];

  it("fills every requested day with 0 when there are no sessions", () => {
    expect(bucketSecondsByDay([], TZ, days)).toEqual([
      { date: "2026-08-13", seconds: 0 },
      { date: "2026-08-14", seconds: 0 },
      { date: "2026-08-15", seconds: 0 },
    ]);
  });

  it("buckets multiple sessions on the same day together", () => {
    // 01:00Z and 05:00Z on 08-15 are both 10:00/14:00 KST → same KST day.
    const sessions = [
      session("2026-08-15T01:00:00Z", 600),
      session("2026-08-15T05:00:00Z", 300),
    ];
    const result = bucketSecondsByDay(sessions, TZ, days);
    expect(result.find((d) => d.date === "2026-08-15")?.seconds).toBe(900);
  });

  it("handles the day boundary in the user's timezone, not UTC", () => {
    // 2026-08-14T15:30:00Z is 2026-08-15 00:30 KST → belongs to 08-15, not 08-14.
    const sessions = [session("2026-08-14T15:30:00Z", 120)];
    const result = bucketSecondsByDay(sessions, TZ, days);
    expect(result.find((d) => d.date === "2026-08-14")?.seconds).toBe(0);
    expect(result.find((d) => d.date === "2026-08-15")?.seconds).toBe(120);
  });

  it("ignores sessions outside the requested day range", () => {
    const sessions = [session("2026-01-01T01:00:00Z", 999)];
    const result = bucketSecondsByDay(sessions, TZ, days);
    expect(result.reduce((sum, d) => sum + d.seconds, 0)).toBe(0);
  });
});

describe("groupSecondsBySubject", () => {
  it("returns an empty list for no sessions", () => {
    expect(groupSecondsBySubject([])).toEqual([]);
  });

  it("groups multiple sessions of the same subject", () => {
    const sessions = [
      session("2026-08-15T01:00:00Z", 600, "math"),
      session("2026-08-15T03:00:00Z", 300, "math"),
    ];
    const result = groupSecondsBySubject(sessions);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ subjectId: "math", seconds: 900, sessionCount: 2 });
  });

  it("sorts multiple subjects descending by total seconds", () => {
    const sessions = [
      session("2026-08-15T01:00:00Z", 300, "eng"),
      session("2026-08-15T02:00:00Z", 900, "math"),
    ];
    const result = groupSecondsBySubject(sessions);
    expect(result.map((r) => r.subjectId)).toEqual(["math", "eng"]);
  });

  it("groups sessions with no subject under a null bucket", () => {
    const sessions = [session("2026-08-15T01:00:00Z", 300, null)];
    const result = groupSecondsBySubject(sessions);
    expect(result).toEqual([
      {
        subjectId: null,
        seconds: 300,
        sessionCount: 1,
        lastStudiedAt: sessions[0]!.startedAt,
      },
    ]);
  });

  it("tracks the most recent session as lastStudiedAt", () => {
    const earlier = session("2026-08-14T01:00:00Z", 300, "math");
    const later = session("2026-08-15T01:00:00Z", 300, "math");
    const result = groupSecondsBySubject([earlier, later]);
    expect(result[0]!.lastStudiedAt).toEqual(later.startedAt);
  });
});

describe("countActiveDays", () => {
  it("is 0 for no sessions", () => {
    expect(countActiveDays([], TZ)).toBe(0);
  });

  it("counts distinct calendar days, not sessions", () => {
    const sessions = [
      session("2026-08-15T01:00:00Z", 600),
      session("2026-08-15T05:00:00Z", 300),
      session("2026-08-16T01:00:00Z", 300),
    ];
    expect(countActiveDays(sessions, TZ)).toBe(2);
  });
});

describe("computeGoalCompletionPercent", () => {
  it("is 0% for no goals", () => {
    expect(computeGoalCompletionPercent([])).toBe(0);
  });

  it("is 0% when nothing is complete", () => {
    const goals = [{ targetValue: 10, currentValue: 0 }];
    expect(computeGoalCompletionPercent(goals)).toBe(0);
  });

  it("rounds a partial completion rate", () => {
    const goals = [
      { targetValue: 10, currentValue: 10 },
      { targetValue: 10, currentValue: 5 },
    ];
    expect(computeGoalCompletionPercent(goals)).toBe(50);
  });

  it("is 100% when every goal is met or exceeded", () => {
    const goals = [
      { targetValue: 10, currentValue: 10 },
      { targetValue: 5, currentValue: 8 },
    ];
    expect(computeGoalCompletionPercent(goals)).toBe(100);
  });
});

describe("computeGoalFillPercent", () => {
  it("is 0% when nothing has been done", () => {
    expect(computeGoalFillPercent({ targetValue: 10, currentValue: 0 })).toBe(0);
  });

  it("rounds a partial fill", () => {
    expect(computeGoalFillPercent({ targetValue: 3, currentValue: 1 })).toBe(33);
  });

  it("is 100% exactly at the target", () => {
    expect(computeGoalFillPercent({ targetValue: 10, currentValue: 10 })).toBe(100);
  });

  it("clamps above-target progress to 100%", () => {
    expect(computeGoalFillPercent({ targetValue: 5, currentValue: 8 })).toBe(100);
  });

  it("treats a non-positive target as 0% rather than dividing by zero", () => {
    expect(computeGoalFillPercent({ targetValue: 0, currentValue: 0 })).toBe(0);
  });
});

describe("compareToPrevious", () => {
  it("reports 'up' with a positive delta when current exceeds previous", () => {
    expect(compareToPrevious(3600, 1800)).toEqual({
      deltaSeconds: 1800,
      direction: "up",
    });
  });

  it("reports 'down' with a negative delta when current is lower", () => {
    expect(compareToPrevious(1800, 3600)).toEqual({
      deltaSeconds: -1800,
      direction: "down",
    });
  });

  it("reports 'flat' when unchanged", () => {
    expect(compareToPrevious(1800, 1800)).toEqual({ deltaSeconds: 0, direction: "flat" });
  });
});
