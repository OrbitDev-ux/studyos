import { describe, expect, it } from "vitest";
import { buildDailyMissions, missionUnitKey, type MissionInput } from "@/features/learning/mission";
import type { WeaknessUnit } from "@/features/learning/weakness-compute";

const NOW = new Date("2026-08-19T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function weakUnit(overrides: Partial<WeaknessUnit> = {}): WeaknessUnit {
  return {
    subjectId: "math",
    subjectName: "수학",
    unit: "일차방정식",
    attempts: 10,
    correct: 4,
    overallAccuracy: 40,
    mastery: 40,
    band: "RED",
    recentWrongStreak: 0,
    avgDurationMs: null,
    lastAttemptAt: NOW,
    ...overrides,
  };
}

function baseInput(overrides: Partial<MissionInput> = {}): MissionInput {
  return {
    dueReviewCount: 0,
    reviewsDoneToday: 0,
    weaknessUnits: [],
    attemptsByUnitToday: new Map(),
    totalAttemptsToday: 0,
    ...overrides,
  };
}

describe("buildDailyMissions", () => {
  it("아무 학습 데이터도 없으면 빈 보드를 반환한다 (숫자를 지어내지 않는다)", () => {
    const board = buildDailyMissions(baseInput(), NOW);
    expect(board).toEqual({
      missions: [],
      totalTarget: 0,
      totalDone: 0,
      progressPercent: 0,
      estimatedMinutes: 0,
      hasData: false,
    });
  });

  it("우선순위 1: 오늘 복습 due가 있으면 REVIEW_DUE가 먼저 온다", () => {
    const board = buildDailyMissions(
      baseInput({ dueReviewCount: 3, weaknessUnits: [weakUnit({ attempts: 5 })] }),
      NOW,
    );
    expect(board.missions[0]!.type).toBe("REVIEW_DUE");
  });

  it("우선순위 2: 반복 오답(streak≥2) 단원이 mastery 낮은 단원보다 먼저 온다", () => {
    const board = buildDailyMissions(
      baseInput({
        weaknessUnits: [
          weakUnit({ unit: "반복오답단원", recentWrongStreak: 2, mastery: 60 }),
          weakUnit({ unit: "낮은마스터리단원", recentWrongStreak: 0, mastery: 30 }),
        ],
      }),
      NOW,
    );
    const types = board.missions.map((m) => m.type);
    expect(types.indexOf("REPEATED_WRONG")).toBeLessThan(types.indexOf("LOW_MASTERY"));
  });

  it("우선순위 4: 오래 학습하지 않은(7일+) 단원은 STALE_UNIT으로 분류된다", () => {
    const board = buildDailyMissions(
      baseInput({
        weaknessUnits: [
          weakUnit({
            mastery: 90, // not weak by mastery
            recentWrongStreak: 0, // not a repeat-wrong
            lastAttemptAt: new Date(NOW.getTime() - 10 * DAY_MS),
          }),
        ],
      }),
      NOW,
    );
    expect(board.missions.some((m) => m.type === "STALE_UNIT")).toBe(true);
  });

  it("표본이 너무 적은(attempts<2) 단원은 미션으로 뽑지 않는다", () => {
    const board = buildDailyMissions(
      baseInput({ weaknessUnits: [weakUnit({ attempts: 1, mastery: 10 })] }),
      NOW,
    );
    // Falls through to the GENERAL_PRACTICE fallback, not a weakness mission.
    expect(board.missions.some((m) => m.type === "LOW_MASTERY")).toBe(false);
  });

  it("약점 미션이 하나도 없으면 GENERAL_PRACTICE로 대체된다", () => {
    const board = buildDailyMissions(baseInput({ totalAttemptsToday: 3 }), NOW);
    expect(board.missions).toHaveLength(1);
    expect(board.missions[0]!.type).toBe("GENERAL_PRACTICE");
  });

  it("같은 단원이 여러 우선순위 조건에 걸려도 미션 하나로만 뽑힌다 (중복 방지)", () => {
    const board = buildDailyMissions(
      baseInput({
        weaknessUnits: [
          weakUnit({ recentWrongStreak: 3, mastery: 20 }), // matches both REPEATED_WRONG and LOW_MASTERY
        ],
      }),
      NOW,
    );
    const key = missionUnitKey("math", "일차방정식");
    const matching = board.missions.filter((m) => m.id.endsWith(key));
    expect(matching).toHaveLength(1);
    expect(matching[0]!.type).toBe("REPEATED_WRONG"); // higher priority wins
  });

  it("실제 오늘 풀이 수만큼만 done으로 인정한다 (체크박스가 아니라 실제 데이터)", () => {
    const key = missionUnitKey("math", "일차방정식");
    const board = buildDailyMissions(
      baseInput({
        weaknessUnits: [weakUnit({ mastery: 30 })],
        attemptsByUnitToday: new Map([[key, 3]]),
      }),
      NOW,
    );
    const mission = board.missions.find((m) => m.type === "LOW_MASTERY")!;
    expect(mission.done).toBe(3);
    expect(mission.completed).toBe(false); // target is 5
  });
});
