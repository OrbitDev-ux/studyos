import { getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getWeaknessBreakdown } from "@/features/learning/weakness";
import { getDueReviewCount } from "@/features/review/queries";
import {
  buildDailyMissions,
  missionUnitKey,
  type MissionBoard,
} from "@/features/learning/mission";

// Must match weakness-compute's UNSPECIFIED_UNIT so today's attempts bucket into
// the same unit keys the weakness engine produces.
const UNSPECIFIED_UNIT = "미지정";

/**
 * Today's Daily Mission board for a user, computed entirely from real data:
 * the Weakness Engine (Phase 3), due reviews (Phase 5), and today's
 * ProblemAttempt log. Nothing is stored. A brand-new user gets an empty board
 * (hasData:false) and no DB writes.
 */
export async function getDailyMissionBoard(
  userId: string,
  timezone: string,
): Promise<MissionBoard> {
  const { start, end } = getTodayRange(timezone);

  const [weaknessUnits, dueReviewCount, todaysAttempts] = await Promise.all([
    getWeaknessBreakdown(userId),
    getDueReviewCount(userId),
    prisma.problemAttempt.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { problemId: true, subjectId: true, unit: true, source: true, isCorrect: true },
    }),
  ]);

  const attemptsByUnitToday = new Map<string, number>();
  const reviewedProblemsToday = new Set<string>();
  for (const attempt of todaysAttempts) {
    const key = missionUnitKey(attempt.subjectId, attempt.unit ?? UNSPECIFIED_UNIT);
    attemptsByUnitToday.set(key, (attemptsByUnitToday.get(key) ?? 0) + 1);
    // A "completed review" = a correct attempt made from the review flow today.
    if (attempt.source === "review" && attempt.isCorrect) {
      reviewedProblemsToday.add(attempt.problemId);
    }
  }

  return buildDailyMissions({
    dueReviewCount,
    reviewsDoneToday: reviewedProblemsToday.size,
    weaknessUnits,
    attemptsByUnitToday,
    totalAttemptsToday: todaysAttempts.length,
  });
}
