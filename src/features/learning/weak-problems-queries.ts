import { getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getWeaknessBreakdown } from "@/features/learning/weakness";
import { getDueReviews } from "@/features/review/queries";
import { missionUnitKey } from "@/features/learning/mission";
import {
  selectWeakProblems,
  type CandidateProblem,
  type WeakProblemRecommendation,
} from "@/features/learning/weak-problems";

const UNSPECIFIED_UNIT = "미지정";
const DEFAULT_LIMIT = 3;
// How many due reviews to consider as candidates (they take top priority).
const DUE_CANDIDATE_LIMIT = 10;

export type WeakProblemBoard = {
  recommendations: WeakProblemRecommendation[];
  hasData: boolean;
};

/**
 * Today's weak-problem recommendations for a user — real Problem rows chosen
 * from the user's learning state (Weakness Engine + due reviews + today's
 * attempts). Everything is scoped to userId; no other user's data is read.
 * A brand-new user (no attempts, no due reviews) gets hasData:false and no
 * fabricated stats.
 */
export async function getWeakProblemBoard(
  userId: string,
  timezone: string,
  limit: number = DEFAULT_LIMIT,
): Promise<WeakProblemBoard> {
  const { start, end } = getTodayRange(timezone);

  const [weaknessUnits, dueRaw, todaysAttempts, userProblems] = await Promise.all([
    getWeaknessBreakdown(userId),
    getDueReviews(userId, DUE_CANDIDATE_LIMIT),
    prisma.problemAttempt.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { problemId: true, subjectId: true, unit: true, isCorrect: true },
    }),
    // Candidate pool = the user's OWN problems only (scoped by userId).
    prisma.problem.findMany({
      where: { userId },
      select: { id: true, subjectId: true, unit: true, difficulty: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Today's activity: completed (correct) problems and per-unit attempt counts.
  const solvedTodayIds = new Set<string>();
  const attemptsByUnitToday = new Map<string, number>();
  for (const a of todaysAttempts) {
    const key = missionUnitKey(a.subjectId, a.unit ?? UNSPECIFIED_UNIT);
    attemptsByUnitToday.set(key, (attemptsByUnitToday.get(key) ?? 0) + 1);
    if (a.isCorrect) solvedTodayIds.add(a.problemId);
  }

  // Real candidate problems grouped by unit key.
  const candidatesByUnit = new Map<string, CandidateProblem[]>();
  for (const p of userProblems) {
    const key = missionUnitKey(p.subjectId, p.unit ?? UNSPECIFIED_UNIT);
    const list = candidatesByUnit.get(key) ?? [];
    list.push({ id: p.id, difficulty: p.difficulty });
    candidatesByUnit.set(key, list);
  }

  const dueReviews = dueRaw.map((wa) => ({
    problemId: wa.problem.id,
    subjectId: wa.problem.subjectId,
    subjectName: wa.problem.subject?.name ?? null,
    unit: wa.problem.unit,
    difficulty: wa.problem.difficulty,
  }));

  const recommendations = selectWeakProblems({
    dueReviews,
    weaknessUnits,
    candidatesByUnit,
    solvedTodayIds,
    attemptsByUnitToday,
    limit,
  });

  const hasData =
    weaknessUnits.length > 0 || dueReviews.length > 0 || todaysAttempts.length > 0;

  return { recommendations, hasData };
}
