import { describe, expect, it } from "vitest";
import { bandFor, computeWeaknessUnits, type AttemptRow } from "@/features/learning/weakness-compute";

const NOW = new Date("2026-08-19T00:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function attempt(
  isCorrect: boolean,
  daysAgo: number,
  overrides: Partial<AttemptRow> = {},
): AttemptRow {
  return {
    subjectId: "math-subject",
    unit: "일차방정식",
    isCorrect,
    createdAt: new Date(NOW - daysAgo * DAY_MS),
    durationMs: null,
    ...overrides,
  };
}

describe("computeWeaknessUnits", () => {
  it("빈 로그는 빈 배열을 반환한다 (숫자를 지어내지 않는다)", () => {
    expect(computeWeaknessUnits([], new Map())).toEqual([]);
  });

  // Phase 5's own worked example: 수학/중1/일차방정식, 최근 10문제 중 6문제
  // 오답, 반복 오답 3회 → weak.
  it("최근 10문제 중 6문제를 틀리고 최근 3연속 오답이면 약점으로 잡힌다 (RED/ORANGE)", () => {
    const rows: AttemptRow[] = [
      attempt(false, 0), // most recent
      attempt(false, 1),
      attempt(false, 2), // 3 consecutive recent wrongs
      attempt(true, 3), // breaks the streak
      attempt(false, 4),
      attempt(true, 5),
      attempt(false, 6),
      attempt(true, 7),
      attempt(false, 8),
      attempt(true, 9),
    ];
    const [unit] = computeWeaknessUnits(rows, new Map([["math-subject", "수학"]]), NOW);

    expect(unit).toBeDefined();
    expect(unit!.attempts).toBe(10);
    expect(unit!.correct).toBe(4);
    expect(unit!.overallAccuracy).toBe(40);
    expect(unit!.recentWrongStreak).toBe(3);
    expect(unit!.band).not.toBe("GREEN");
    expect(unit!.subjectName).toBe("수학");
    expect(unit!.unit).toBe("일차방정식");
  });

  it("최근 오답이 오래된 오답보다 mastery를 더 많이 끌어내린다 (recency 가중)", () => {
    // Same 5-correct/5-wrong split either way, but group A's wrongs are all
    // recent and group B's wrongs are all old — A should score weaker.
    const recentWrongs: AttemptRow[] = [
      attempt(false, 0),
      attempt(false, 1),
      attempt(false, 2),
      attempt(false, 3),
      attempt(false, 4),
      attempt(true, 60),
      attempt(true, 61),
      attempt(true, 62),
      attempt(true, 63),
      attempt(true, 64),
    ];
    const oldWrongs: AttemptRow[] = [
      attempt(true, 0),
      attempt(true, 1),
      attempt(true, 2),
      attempt(true, 3),
      attempt(true, 4),
      attempt(false, 60),
      attempt(false, 61),
      attempt(false, 62),
      attempt(false, 63),
      attempt(false, 64),
    ];

    const [weak] = computeWeaknessUnits(recentWrongs, new Map(), NOW);
    const [strong] = computeWeaknessUnits(oldWrongs, new Map(), NOW);

    // Same lifetime accuracy...
    expect(weak!.overallAccuracy).toBe(strong!.overallAccuracy);
    // ...but recency-weighted mastery tells them apart.
    expect(weak!.mastery).toBeLessThan(strong!.mastery);
  });

  it("과목/단원별로 따로 그룹핑한다", () => {
    const rows: AttemptRow[] = [
      attempt(true, 0, { unit: "일차방정식" }),
      attempt(false, 0, { unit: "확률" }),
    ];
    const units = computeWeaknessUnits(rows, new Map(), NOW);
    expect(units).toHaveLength(2);
    expect(new Set(units.map((u) => u.unit))).toEqual(new Set(["일차방정식", "확률"]));
  });

  it("가장 약한(mastery 낮은) 단원이 먼저 온다", () => {
    const rows: AttemptRow[] = [
      attempt(true, 0, { unit: "잘하는 단원" }),
      attempt(true, 1, { unit: "잘하는 단원" }),
      attempt(false, 0, { unit: "약한 단원" }),
      attempt(false, 1, { unit: "약한 단원" }),
    ];
    const units = computeWeaknessUnits(rows, new Map(), NOW);
    expect(units[0]!.unit).toBe("약한 단원");
  });

  it("unit이 null이면 '미지정'으로 표시된다 (에러 아님)", () => {
    const rows: AttemptRow[] = [attempt(true, 0, { unit: null })];
    const [unit] = computeWeaknessUnits(rows, new Map(), NOW);
    expect(unit!.unit).toBe("미지정");
  });
});

describe("bandFor", () => {
  it("50 미만은 RED, 50~79는 ORANGE, 80 이상은 GREEN", () => {
    expect(bandFor(0)).toBe("RED");
    expect(bandFor(49)).toBe("RED");
    expect(bandFor(50)).toBe("ORANGE");
    expect(bandFor(79)).toBe("ORANGE");
    expect(bandFor(80)).toBe("GREEN");
    expect(bandFor(100)).toBe("GREEN");
  });
});
