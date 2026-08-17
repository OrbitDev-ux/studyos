import type { Subject } from "@/generated/prisma/client";
import {
  getLastNDateStrings,
  getRecentDateOnlyRange,
  getRecentRange,
  getTodayRange,
  getZonedDateOnly,
} from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  bucketSecondsByDay,
  compareToPrevious,
  computeGoalCompletionPercent,
  countActiveDays,
  groupSecondsBySubject,
  sumDurationSec,
  type SessionRow,
  type TrendDirection,
} from "@/features/statistics/aggregate";
import { getGoalsInDateRange, getTodayGoals } from "@/features/goals/queries";
import { getTodayStudySeconds } from "@/features/study-sessions/queries";

export function getTodayTodoCounts(userId: string, timezone: string) {
  const date = getZonedDateOnly(timezone);
  return prisma.todo.groupBy({
    by: ["completed"],
    where: { userId, dueDate: date },
    _count: { _all: true },
  });
}

export async function getTodaySubjectBreakdown(userId: string, timezone: string) {
  const { start, end } = getTodayRange(timezone);

  const sessions = await prisma.studySession.groupBy({
    by: ["subjectId"],
    where: { userId, startedAt: { gte: start, lt: end } },
    _sum: { durationSec: true },
  });

  const subjectIds = sessions
    .map((s) => s.subjectId)
    .filter((id): id is string => id !== null);
  const subjects = await prisma.subject.findMany({ where: { id: { in: subjectIds } } });
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return sessions
    .map((s) => ({
      subject: s.subjectId ? (subjectById.get(s.subjectId) ?? null) : null,
      seconds: s._sum.durationSec ?? 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

const WEEK_DAYS = 7;
const MONTH_DAYS = 30;

const SESSION_SELECT = { startedAt: true, durationSec: true, subjectId: true } as const;

function fetchSessions(userId: string, start: Date, end: Date): Promise<SessionRow[]> {
  return prisma.studySession.findMany({
    where: { userId, startedAt: { gte: start, lt: end } },
    select: SESSION_SELECT,
  });
}

async function resolveSubjects(
  subjectIds: (string | null)[],
): Promise<Map<string, Subject>> {
  const ids = subjectIds.filter((id): id is string => id !== null);
  if (ids.length === 0) return new Map();
  const subjects = await prisma.subject.findMany({ where: { id: { in: ids } } });
  return new Map(subjects.map((s) => [s.id, s]));
}

export type TodayStatistics = {
  totalSeconds: number;
  sessionCount: number;
  topSubject: { subject: Subject | null; seconds: number } | null;
  goalCompletionPercent: number;
};

/** Today's headline numbers: study time, session count, top subject, goal completion. */
export async function getTodayStatistics(
  userId: string,
  timezone: string,
): Promise<TodayStatistics> {
  const { start, end } = getTodayRange(timezone);
  const [totalSeconds, sessionCount, breakdown, goals] = await Promise.all([
    getTodayStudySeconds(userId, timezone),
    prisma.studySession.count({ where: { userId, startedAt: { gte: start, lt: end } } }),
    getTodaySubjectBreakdown(userId, timezone),
    getTodayGoals(userId, timezone),
  ]);

  return {
    totalSeconds,
    sessionCount,
    topSubject: breakdown[0] ?? null,
    goalCompletionPercent: computeGoalCompletionPercent(goals),
  };
}

export type WeeklyStatistics = {
  totalSeconds: number;
  avgDailySeconds: number;
  sessionCount: number;
  dailyBreakdown: { date: string; seconds: number }[];
  subjectBreakdown: { subject: Subject | null; seconds: number; sessionCount: number }[];
  goalCompletionPercent: number;
  previousWeekSeconds: number;
  deltaSeconds: number;
  direction: TrendDirection;
};

/** Last 7 days (today inclusive): totals, daily/subject breakdown, vs. the 7 days before that. */
export async function getWeeklyStatistics(
  userId: string,
  timezone: string,
): Promise<WeeklyStatistics> {
  const { start, end } = getRecentRange(timezone, WEEK_DAYS);
  const { start: twoWeeksAgo } = getRecentRange(timezone, WEEK_DAYS * 2);
  const { startDate, endDate } = getRecentDateOnlyRange(timezone, WEEK_DAYS);
  const days = getLastNDateStrings(timezone, WEEK_DAYS);

  const [sessions, previousWeek, goals] = await Promise.all([
    fetchSessions(userId, start, end),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: twoWeeksAgo, lt: start } },
      _sum: { durationSec: true },
    }),
    getGoalsInDateRange(userId, startDate, endDate),
  ]);

  const totalSeconds = sumDurationSec(sessions);
  const previousWeekSeconds = previousWeek._sum.durationSec ?? 0;
  const { deltaSeconds, direction } = compareToPrevious(
    totalSeconds,
    previousWeekSeconds,
  );

  const subjectTotals = groupSecondsBySubject(sessions);
  const subjectMap = await resolveSubjects(subjectTotals.map((s) => s.subjectId));

  return {
    totalSeconds,
    avgDailySeconds: Math.round(totalSeconds / WEEK_DAYS),
    sessionCount: sessions.length,
    dailyBreakdown: bucketSecondsByDay(sessions, timezone, days),
    subjectBreakdown: subjectTotals.map((s) => ({
      subject: s.subjectId ? (subjectMap.get(s.subjectId) ?? null) : null,
      seconds: s.seconds,
      sessionCount: s.sessionCount,
    })),
    goalCompletionPercent: computeGoalCompletionPercent(goals),
    previousWeekSeconds,
    deltaSeconds,
    direction,
  };
}

export type MonthlyStatistics = {
  totalSeconds: number;
  avgDailySeconds: number;
  sessionCount: number;
  activeDayCount: number;
  topSubject: { subject: Subject | null; seconds: number } | null;
  previousPeriodSeconds: number;
  deltaSeconds: number;
  direction: TrendDirection;
};

/** Last 30 days (rolling, not calendar-month): totals, active days, top subject, vs. the prior 30 days. */
export async function getMonthlyStatistics(
  userId: string,
  timezone: string,
): Promise<MonthlyStatistics> {
  const { start, end } = getRecentRange(timezone, MONTH_DAYS);
  const { start: previousStart } = getRecentRange(timezone, MONTH_DAYS * 2);

  const [sessions, previousPeriod] = await Promise.all([
    fetchSessions(userId, start, end),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: previousStart, lt: start } },
      _sum: { durationSec: true },
    }),
  ]);

  const totalSeconds = sumDurationSec(sessions);
  const previousPeriodSeconds = previousPeriod._sum.durationSec ?? 0;
  const { deltaSeconds, direction } = compareToPrevious(
    totalSeconds,
    previousPeriodSeconds,
  );

  const subjectTotals = groupSecondsBySubject(sessions);
  const top = subjectTotals[0];
  const subjectMap = top
    ? await resolveSubjects([top.subjectId])
    : new Map<string, Subject>();

  return {
    totalSeconds,
    avgDailySeconds: Math.round(totalSeconds / MONTH_DAYS),
    sessionCount: sessions.length,
    activeDayCount: countActiveDays(sessions, timezone),
    topSubject: top
      ? {
          subject: top.subjectId ? (subjectMap.get(top.subjectId) ?? null) : null,
          seconds: top.seconds,
        }
      : null,
    previousPeriodSeconds,
    deltaSeconds,
    direction,
  };
}

export type SubjectStatistic = {
  subject: Subject | null;
  seconds: number;
  sessionCount: number;
  avgSessionSeconds: number;
  lastStudiedAt: Date | null;
  percent: number;
};

/** Per-subject totals over the trailing week or month, sorted by time studied. */
export async function getSubjectStatistics(
  userId: string,
  timezone: string,
  period: "week" | "month",
): Promise<SubjectStatistic[]> {
  const days = period === "week" ? WEEK_DAYS : MONTH_DAYS;
  const { start, end } = getRecentRange(timezone, days);
  const sessions = await fetchSessions(userId, start, end);

  const totals = groupSecondsBySubject(sessions);
  const totalSeconds = sumDurationSec(sessions);
  const subjectMap = await resolveSubjects(totals.map((s) => s.subjectId));

  return totals.map((s) => ({
    subject: s.subjectId ? (subjectMap.get(s.subjectId) ?? null) : null,
    seconds: s.seconds,
    sessionCount: s.sessionCount,
    avgSessionSeconds: Math.round(s.seconds / s.sessionCount),
    lastStudiedAt: s.lastStudiedAt,
    percent: totalSeconds === 0 ? 0 : Math.round((s.seconds / totalSeconds) * 100),
  }));
}

/** Daily study-time series for the trend chart — 7 or 30 days ending today. */
export async function getStudyTrend(
  userId: string,
  timezone: string,
  days: 7 | 30,
): Promise<{ date: string; seconds: number }[]> {
  const { start, end } = getRecentRange(timezone, days);
  const sessions = await fetchSessions(userId, start, end);
  return bucketSecondsByDay(sessions, timezone, getLastNDateStrings(timezone, days));
}

export type GoalStatistics = {
  today: {
    goals: Awaited<ReturnType<typeof getTodayGoals>>;
    completedCount: number;
    totalCount: number;
    percent: number;
  };
  week: {
    percent: number;
    completedCount: number;
    totalCount: number;
  };
};

/** Today's goal checklist + this week's overall goal-completion rate. */
export async function getGoalStatistics(
  userId: string,
  timezone: string,
): Promise<GoalStatistics> {
  const { startDate, endDate } = getRecentDateOnlyRange(timezone, WEEK_DAYS);
  const [todayGoals, weekGoals] = await Promise.all([
    getTodayGoals(userId, timezone),
    getGoalsInDateRange(userId, startDate, endDate),
  ]);

  return {
    today: {
      goals: todayGoals,
      completedCount: todayGoals.filter((g) => g.currentValue >= g.targetValue).length,
      totalCount: todayGoals.length,
      percent: computeGoalCompletionPercent(todayGoals),
    },
    week: {
      percent: computeGoalCompletionPercent(weekGoals),
      completedCount: weekGoals.filter((g) => g.currentValue >= g.targetValue).length,
      totalCount: weekGoals.length,
    },
  };
}
