import { prisma } from "@/lib/prisma";
import { getStreakStats, getTotalStudySeconds } from "@/features/study-sessions/queries";
import { getLevelProgress, type LevelProgress } from "@/features/growth/level";

/**
 * The `/growth` page's single data source. Streak is NEVER re-derived here —
 * it's the exact same getStreakStats() the stats page already uses, straight
 * from StudySession — so there is only ever one streak number in the app.
 */
export type GrowthSummary = {
  totalXp: number;
  level: LevelProgress;
  currentStreak: number;
  longestStreak: number;
  totalStudySeconds: number;
  missionsCompleted: number;
};

export async function getGrowthSummary(userId: string, timezone: string): Promise<GrowthSummary> {
  const [growth, streakStats, totalStudySeconds, missionsCompleted] = await Promise.all([
    prisma.userGrowth.findUnique({ where: { userId }, select: { totalXp: true } }),
    getStreakStats(userId, timezone),
    getTotalStudySeconds(userId),
    prisma.studyMission.count({ where: { userId, status: "COMPLETED" } }),
  ]);

  const totalXp = growth?.totalXp ?? 0;
  return {
    totalXp,
    level: getLevelProgress(totalXp),
    currentStreak: streakStats.current,
    longestStreak: streakStats.longest,
    totalStudySeconds,
    missionsCompleted,
  };
}

/** Recent XP grants, most recent first — the Growth page's Activity History. */
export function getRecentXpEvents(userId: string, limit = 20) {
  return prisma.growthXpEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
