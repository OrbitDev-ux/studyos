import type { Difficulty } from "@/generated/prisma/client";
import type { WeaknessUnit } from "@/features/learning/weakness-compute";
import { missionUnitKey } from "@/features/learning/mission";

/**
 * 오늘의 약점 문제 (Phase 7) — pure selection logic. Picks which REAL problems to
 * recommend from the user's learning state; it never invents problems (the
 * query layer supplies actual Problem rows as candidates). No DB imports here so
 * it can be unit-tested deterministically.
 *
 * Priority:
 *   1. due review problems (Phase 5) — reviews keep top priority
 *   2. units with recent repeated wrong answers
 *   3. lowest-mastery units
 *   4. long-unstudied (stale) units
 * Units already practiced enough today are demoted; problems already completed
 * today are never recommended again.
 */
export type WeakProblemCategory =
  | "REVIEW_DUE"
  | "REPEATED_WRONG"
  | "LOW_MASTERY"
  | "STALE_UNIT";

export type WeakProblemRecommendation = {
  problemId: string;
  subjectId: string | null;
  subjectName: string | null;
  unit: string | null;
  difficulty: Difficulty;
  reason: string;
  /** 1-based rank; 1 = highest priority. */
  priority: number;
  category: WeakProblemCategory;
};

export type DueReviewItem = {
  problemId: string;
  subjectId: string | null;
  subjectName: string | null;
  unit: string | null;
  difficulty: Difficulty;
};

export type CandidateProblem = { id: string; difficulty: Difficulty };

export type SelectWeakProblemsInput = {
  /** Due review problems, soonest-due first. */
  dueReviews: DueReviewItem[];
  /** Weakness units from the engine (weakest first). */
  weaknessUnits: WeaknessUnit[];
  /** Real Problem rows per unit key (missionUnitKey), the pool to pick from. */
  candidatesByUnit: Map<string, CandidateProblem[]>;
  /** Problems the user already completed (correct) today — never re-recommend. */
  solvedTodayIds: Set<string>;
  /** Attempts today per unit key — used to demote already-practiced units. */
  attemptsByUnitToday: Map<string, number>;
  limit: number;
  now?: Date;
};

const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;
const REPEAT_MIN_STREAK = 2;
const MASTERY_WEAK_MAX = 80;
const MIN_ATTEMPTS = 2;
const SUFFICIENT_TODAY = 5;

function unitLabel(unit: string | null, subjectName: string | null): string {
  if (unit && unit !== "미지정") return unit;
  return subjectName ?? "이 개념";
}

function reasonFor(
  category: WeakProblemCategory,
  unit: string | null,
  subjectName: string | null,
): string {
  const label = unitLabel(unit, subjectName);
  switch (category) {
    case "REVIEW_DUE":
      return `${label} 복습할 시점이에요. 지난 오답을 다시 풀어보세요.`;
    case "REPEATED_WRONG":
      return `최근 ${label} 문제를 자주 틀려서 추천했어요.`;
    case "LOW_MASTERY":
      return `${label} 정답률이 낮아 집중 연습이 필요해요.`;
    case "STALE_UNIT":
      return `${label}을(를) 오랫동안 풀지 않아 점검이 필요해요.`;
  }
}

const TIER_RANK: Record<Exclude<WeakProblemCategory, "REVIEW_DUE">, number> = {
  REPEATED_WRONG: 0,
  LOW_MASTERY: 1,
  STALE_UNIT: 2,
};

export function selectWeakProblems(
  input: SelectWeakProblemsInput,
): WeakProblemRecommendation[] {
  const { dueReviews, weaknessUnits, candidatesByUnit, solvedTodayIds, attemptsByUnitToday, limit } =
    input;
  const now = input.now ?? new Date();

  const recs: WeakProblemRecommendation[] = [];
  const used = new Set<string>();

  const push = (rec: Omit<WeakProblemRecommendation, "priority">) => {
    recs.push({ ...rec, priority: recs.length + 1 });
    used.add(rec.problemId);
  };

  // 1. Due reviews first (Phase 5) — real problems behind due wrong answers.
  for (const dr of dueReviews) {
    if (recs.length >= limit) break;
    if (used.has(dr.problemId) || solvedTodayIds.has(dr.problemId)) continue;
    push({
      problemId: dr.problemId,
      subjectId: dr.subjectId,
      subjectName: dr.subjectName,
      unit: dr.unit,
      difficulty: dr.difficulty,
      reason: reasonFor("REVIEW_DUE", dr.unit, dr.subjectName),
      category: "REVIEW_DUE",
    });
  }

  if (recs.length >= limit) return recs;

  // 2–4. Weakness-driven picks from real Problem candidates.
  const tiered = weaknessUnits
    .filter((u) => u.attempts >= MIN_ATTEMPTS)
    .map((u) => {
      const key = missionUnitKey(u.subjectId, u.unit);
      let category: Exclude<WeakProblemCategory, "REVIEW_DUE"> | null = null;
      if (u.recentWrongStreak >= REPEAT_MIN_STREAK) category = "REPEATED_WRONG";
      else if (u.mastery < MASTERY_WEAK_MAX) category = "LOW_MASTERY";
      else if (now.getTime() - u.lastAttemptAt.getTime() > STALE_MS) category = "STALE_UNIT";
      return { u, key, category, practicedToday: attemptsByUnitToday.get(key) ?? 0 };
    })
    .filter(
      (t): t is typeof t & { category: Exclude<WeakProblemCategory, "REVIEW_DUE"> } =>
        t.category !== null,
    );

  // Order: not-yet-practiced-enough-today first, then tier, then weakest mastery.
  tiered.sort((a, b) => {
    const aSuff = a.practicedToday >= SUFFICIENT_TODAY ? 1 : 0;
    const bSuff = b.practicedToday >= SUFFICIENT_TODAY ? 1 : 0;
    return (
      aSuff - bSuff ||
      TIER_RANK[a.category] - TIER_RANK[b.category] ||
      a.u.mastery - b.u.mastery
    );
  });

  for (const t of tiered) {
    if (recs.length >= limit) break;
    const candidates = candidatesByUnit.get(t.key) ?? [];
    for (const cand of candidates) {
      if (recs.length >= limit) break;
      if (used.has(cand.id) || solvedTodayIds.has(cand.id)) continue;
      push({
        problemId: cand.id,
        subjectId: t.u.subjectId,
        subjectName: t.u.subjectName,
        unit: t.u.unit,
        difficulty: cand.difficulty,
        reason: reasonFor(t.category, t.u.unit, t.u.subjectName),
        category: t.category,
      });
    }
  }

  return recs;
}
