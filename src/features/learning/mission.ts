import type { WeaknessUnit } from "@/features/learning/weakness-compute";

/**
 * Daily Mission (Phase 6) — pure decision logic. Given the user's real learning
 * signals it produces today's mission board; it stores nothing and invents
 * nothing. Completion is not a checkbox: each mission's `done` is supplied from
 * the user's actual ProblemAttempt / review activity today, so a mission only
 * completes when real problems were solved.
 *
 * Priority (spec):
 *   1. 오늘 due 복습            → REVIEW_DUE
 *   2. 최근 반복 오답           → REPEATED_WRONG
 *   3. mastery 낮은 단원        → LOW_MASTERY
 *   4. 오래 학습 안 한 단원     → STALE_UNIT
 *   5. 일반 문제 풀이           → GENERAL_PRACTICE
 */
export type MissionType =
  | "REVIEW_DUE"
  | "REPEATED_WRONG"
  | "LOW_MASTERY"
  | "STALE_UNIT"
  | "GENERAL_PRACTICE";

export type DailyMission = {
  id: string;
  type: MissionType;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  unit: string | null;
  target: number;
  done: number;
  completed: boolean;
  estimatedMinutes: number;
  /** Where the user goes to actually do this mission. */
  href: string;
};

export type MissionBoard = {
  missions: DailyMission[];
  totalTarget: number;
  totalDone: number;
  progressPercent: number;
  estimatedMinutes: number;
  /** False only for a brand-new user with zero learning data → empty state. */
  hasData: boolean;
};

export type MissionInput = {
  dueReviewCount: number;
  reviewsDoneToday: number;
  weaknessUnits: WeaknessUnit[];
  /** Attempts today keyed by missionUnitKey(subjectId, unitDisplay). */
  attemptsByUnitToday: Map<string, number>;
  totalAttemptsToday: number;
};

// Tunables.
const PRACTICE_TARGET = 5;
const GENERAL_TARGET = 5;
const MAX_PRACTICE_MISSIONS = 3;
const STALE_DAYS = 7;
const REPEAT_WRONG_MIN_STREAK = 2;
const MASTERY_WEAK_MAX = 80; // mastery below this is "weak" (RED/ORANGE)
const MIN_ATTEMPTS = 2; // ignore units with too little signal
const EST_REVIEW_PER = 2;
const EST_PRACTICE_PER = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Stable key joining a subject id with a display unit ("미지정" for null). Must
 * match how the query layer buckets today's attempts. */
export function missionUnitKey(subjectId: string | null, unitDisplay: string): string {
  return `${subjectId ?? ""}::${unitDisplay}`;
}

function practiceMission(
  type: MissionType,
  unit: WeaknessUnit,
  doneToday: number,
): DailyMission {
  const label =
    type === "REPEATED_WRONG"
      ? "취약 문제"
      : type === "STALE_UNIT"
        ? "복습 점검"
        : "집중 연습";
  return {
    id: `${type}:${missionUnitKey(unit.subjectId, unit.unit)}`,
    type,
    title: `${unit.subjectName} · ${unit.unit} ${label}`,
    subjectId: unit.subjectId,
    subjectName: unit.subjectName,
    unit: unit.unit,
    target: PRACTICE_TARGET,
    done: Math.min(doneToday, PRACTICE_TARGET),
    completed: doneToday >= PRACTICE_TARGET,
    estimatedMinutes: PRACTICE_TARGET * EST_PRACTICE_PER,
    href: "/problems",
  };
}

export function buildDailyMissions(input: MissionInput, now: Date = new Date()): MissionBoard {
  const { dueReviewCount, reviewsDoneToday, weaknessUnits, attemptsByUnitToday, totalAttemptsToday } =
    input;

  const hasData =
    dueReviewCount > 0 ||
    reviewsDoneToday > 0 ||
    weaknessUnits.length > 0 ||
    totalAttemptsToday > 0;

  if (!hasData) {
    return {
      missions: [],
      totalTarget: 0,
      totalDone: 0,
      progressPercent: 0,
      estimatedMinutes: 0,
      hasData: false,
    };
  }

  const missions: DailyMission[] = [];

  // 1. Review due (target counts remaining-due + already-done-today so the bar
  //    fills toward 100% as the user clears reviews, rather than items vanishing).
  const reviewTotal = dueReviewCount + reviewsDoneToday;
  if (reviewTotal > 0) {
    missions.push({
      id: "REVIEW_DUE",
      type: "REVIEW_DUE",
      title: "오늘 복습",
      subjectId: null,
      subjectName: null,
      unit: null,
      target: reviewTotal,
      done: Math.min(reviewsDoneToday, reviewTotal),
      completed: reviewsDoneToday >= reviewTotal,
      estimatedMinutes: reviewTotal * EST_REVIEW_PER,
      href: "/review",
    });
  }

  // 2–4. Weakness-based practice missions, prioritized and de-duped by unit.
  const usedKeys = new Set<string>();
  const eligible = weaknessUnits.filter((u) => u.attempts >= MIN_ATTEMPTS);

  const pick = (
    predicate: (u: WeaknessUnit) => boolean,
    type: MissionType,
  ): DailyMission[] =>
    eligible
      .filter((u) => {
        const key = missionUnitKey(u.subjectId, u.unit);
        return !usedKeys.has(key) && predicate(u);
      })
      .map((u) => {
        const key = missionUnitKey(u.subjectId, u.unit);
        usedKeys.add(key);
        return practiceMission(type, u, attemptsByUnitToday.get(key) ?? 0);
      });

  const weaknessMissions = [
    ...pick((u) => u.recentWrongStreak >= REPEAT_WRONG_MIN_STREAK, "REPEATED_WRONG"),
    ...pick((u) => u.mastery < MASTERY_WEAK_MAX, "LOW_MASTERY"),
    ...pick(
      (u) => now.getTime() - u.lastAttemptAt.getTime() > STALE_DAYS * DAY_MS,
      "STALE_UNIT",
    ),
  ].slice(0, MAX_PRACTICE_MISSIONS);

  missions.push(...weaknessMissions);

  // 5. General practice fallback — only when there were no weakness-based
  //    missions (e.g. everything mastered) but the user is active.
  if (weaknessMissions.length === 0) {
    missions.push({
      id: "GENERAL_PRACTICE",
      type: "GENERAL_PRACTICE",
      title: "오늘의 문제 풀이",
      subjectId: null,
      subjectName: null,
      unit: null,
      target: GENERAL_TARGET,
      done: Math.min(totalAttemptsToday, GENERAL_TARGET),
      completed: totalAttemptsToday >= GENERAL_TARGET,
      estimatedMinutes: GENERAL_TARGET * EST_PRACTICE_PER,
      href: "/problems",
    });
  }

  const totalTarget = missions.reduce((sum, m) => sum + m.target, 0);
  const totalDone = missions.reduce((sum, m) => sum + Math.min(m.done, m.target), 0);
  const estimatedMinutes = missions.reduce((sum, m) => sum + m.estimatedMinutes, 0);

  return {
    missions,
    totalTarget,
    totalDone,
    progressPercent: totalTarget === 0 ? 0 : Math.round((totalDone / totalTarget) * 100),
    estimatedMinutes,
    hasData: true,
  };
}
