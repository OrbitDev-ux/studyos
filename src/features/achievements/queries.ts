import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getDueReviewCount } from "@/features/review/queries";
import { getStreak } from "@/features/study-sessions/queries";
import {
  evaluateAchievements,
  longestTrueRun,
  type AchievementCategory,
  type AchievementId,
  type LearningStats,
} from "@/features/achievements/config";

// Bound the correct-streak scan: a 10-in-a-row badge only needs recent history,
// and this keeps the profile view cheap for heavy users.
const CORRECT_STREAK_SCAN_LIMIT = 2000;

/**
 * Derive achievement inputs entirely from existing tables (StudySession,
 * ProblemAttempt, WrongAnswer) — no duplicate stats are stored. Request-scoped
 * memoized so the profile page can read it once per render.
 */
export const getLearningStats = cache(
  async (userId: string, timezone: string): Promise<LearningStats> => {
    const [
      studySessions,
      problemsSolved,
      reviewsCompleted,
      reviewsGraduated,
      totalWrongAnswers,
      dueReviews,
      studyStreak,
      recentAttempts,
    ] = await Promise.all([
      prisma.studySession.count({ where: { userId } }),
      prisma.problemAttempt.count({ where: { userId } }),
      prisma.wrongAnswer.count({ where: { userId, lastReviewedAt: { not: null } } }),
      prisma.wrongAnswer.count({ where: { userId, resolved: true } }),
      prisma.wrongAnswer.count({ where: { userId } }),
      getDueReviewCount(userId),
      getStreak(userId, timezone),
      // desc + take: the most recent N attempts — "asc" would instead scan
      // the OLDEST N, so a heavy user's recent streaks could never be found
      // once their total attempt count exceeds the scan limit.
      prisma.problemAttempt.findMany({
        where: { userId },
        select: { isCorrect: true },
        orderBy: { createdAt: "desc" },
        take: CORRECT_STREAK_SCAN_LIMIT,
      }),
    ]);

    return {
      studySessions,
      studyStreak,
      problemsSolved,
      bestCorrectStreak: longestTrueRun(recentAttempts.map((a) => a.isCorrect)),
      reviewsCompleted,
      reviewsGraduated,
      totalWrongAnswers,
      dueReviews,
    };
  },
);

export type EvaluatedAchievement = {
  id: AchievementId;
  category: AchievementCategory;
  icon: string;
  earned: boolean;
};

export async function getAchievements(
  userId: string,
  timezone: string,
): Promise<{ items: EvaluatedAchievement[]; earnedCount: number }> {
  const stats = await getLearningStats(userId, timezone);
  const items = evaluateAchievements(stats);
  return { items, earnedCount: items.filter((a) => a.earned).length };
}
