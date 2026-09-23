import { prisma } from "@/lib/prisma";
import { getTodayRange, getZonedDateString } from "@/lib/date";
import { computeStreakStats, type StreakStats } from "@/features/study-sessions/streak";

export async function getActiveStudySession(userId: string) {
  const data = await prisma.studySession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (!data) return null;

  // Prisma already returns Date instances here; callers (e.g. the dashboard
  // page) call .toISOString() on this field, so the Date is what they expect.
  return { ...data, startedAt: new Date(data.startedAt) };
}

export async function getTodayStudySeconds(
  userId: string,
  timezone: string,
): Promise<number> {
  const { start, end } = getTodayRange(timezone);
  const agg = await prisma.studySession.aggregate({
    where: { userId, startedAt: { gte: start, lt: end } },
    _sum: { durationSec: true },
  });
  return agg._sum.durationSec ?? 0;
}

/** All-time summed study duration — the Growth page's "총 학습 시간" stat. */
export async function getTotalStudySeconds(userId: string): Promise<number> {
  const agg = await prisma.studySession.aggregate({
    where: { userId },
    _sum: { durationSec: true },
  });
  return agg._sum.durationSec ?? 0;
}

const STREAK_LOOKBACK = 500;

async function fetchStudyDateStrings(
  userId: string,
  timezone: string,
): Promise<string[]> {
  const rows = await prisma.studySession.findMany({
    where: { userId, rewardEligibleDurationSec: { gt: 0 } },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
    take: STREAK_LOOKBACK,
  });

  return rows.map((s) => getZonedDateString(s.startedAt, timezone));
}

export async function getStreak(userId: string, timezone: string): Promise<number> {
  const dates = await fetchStudyDateStrings(userId, timezone);
  const todayStr = getZonedDateString(new Date(), timezone);
  return computeStreakStats(dates, todayStr).current;
}

/** Current + longest streak + last study date — the fuller stats-page view of getStreak. */
export async function getStreakStats(
  userId: string,
  timezone: string,
): Promise<StreakStats> {
  const dates = await fetchStudyDateStrings(userId, timezone);
  const todayStr = getZonedDateString(new Date(), timezone);
  return computeStreakStats(dates, todayStr);
}
