import { getTodayRange, getZonedDateString } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getActiveStudySession(userId: string) {
  return prisma.studySession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
}

export async function getTodayStudySeconds(
  userId: string,
  timezone: string,
): Promise<number> {
  const { start, end } = getTodayRange(timezone);
  const sessions = await prisma.studySession.findMany({
    where: { userId, startedAt: { gte: start, lt: end } },
    select: { durationSec: true },
  });
  return sessions.reduce((sum, session) => sum + session.durationSec, 0);
}

const STREAK_LOOKBACK = 500;

export async function getStreak(userId: string, timezone: string): Promise<number> {
  const sessions = await prisma.studySession.findMany({
    where: { userId, durationSec: { gt: 0 } },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
    take: STREAK_LOOKBACK,
  });

  const studyDates = new Set(
    sessions.map((s) => getZonedDateString(s.startedAt, timezone)),
  );

  let streak = 0;
  const cursor = new Date();
  if (!studyDates.has(getZonedDateString(cursor, timezone))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (studyDates.has(getZonedDateString(cursor, timezone))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
