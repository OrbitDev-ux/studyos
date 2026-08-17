import { getZonedDateString } from "@/lib/date";

/**
 * Minimal shape statistics aggregation needs from a StudySession row. Pure
 * functions here take this instead of the full Prisma model so they stay
 * trivially unit-testable (no DB) and cheap to select for (see queries.ts).
 */
export type SessionRow = {
  startedAt: Date;
  durationSec: number;
  subjectId: string | null;
};

export function sumDurationSec(sessions: SessionRow[]): number {
  return sessions.reduce((sum, s) => sum + s.durationSec, 0);
}

/**
 * Seconds studied per day, keyed by "YYYY-MM-DD" in `timeZone`, for exactly
 * the given `days` (in order) — days with no sessions are included as 0 so
 * charts never silently drop an empty day.
 */
export function bucketSecondsByDay(
  sessions: SessionRow[],
  timeZone: string,
  days: string[],
): { date: string; seconds: number }[] {
  const totals = new Map<string, number>();
  for (const day of days) totals.set(day, 0);
  for (const session of sessions) {
    const day = getZonedDateString(session.startedAt, timeZone);
    if (totals.has(day)) {
      totals.set(day, (totals.get(day) ?? 0) + session.durationSec);
    }
  }
  return days.map((date) => ({ date, seconds: totals.get(date) ?? 0 }));
}

export type SubjectAggregate = {
  subjectId: string | null;
  seconds: number;
  sessionCount: number;
  lastStudiedAt: Date | null;
};

/** Per-subject totals, sorted by seconds descending (busiest subject first). */
export function groupSecondsBySubject(sessions: SessionRow[]): SubjectAggregate[] {
  const bySubject = new Map<string | null, SubjectAggregate>();
  for (const session of sessions) {
    const existing = bySubject.get(session.subjectId);
    if (existing) {
      existing.seconds += session.durationSec;
      existing.sessionCount += 1;
      if (existing.lastStudiedAt === null || session.startedAt > existing.lastStudiedAt) {
        existing.lastStudiedAt = session.startedAt;
      }
    } else {
      bySubject.set(session.subjectId, {
        subjectId: session.subjectId,
        seconds: session.durationSec,
        sessionCount: 1,
        lastStudiedAt: session.startedAt,
      });
    }
  }
  return Array.from(bySubject.values()).sort((a, b) => b.seconds - a.seconds);
}

/** Distinct calendar days (in `timeZone`) with at least one session. */
export function countActiveDays(sessions: SessionRow[], timeZone: string): number {
  const days = new Set(sessions.map((s) => getZonedDateString(s.startedAt, timeZone)));
  return days.size;
}

/**
 * Percent of goals completed (currentValue >= targetValue), rounded to the
 * nearest integer. 0 for an empty goal list — never divide by zero.
 */
export function computeGoalCompletionPercent(
  goals: { targetValue: number; currentValue: number }[],
): number {
  if (goals.length === 0) return 0;
  const completed = goals.filter((g) => g.currentValue >= g.targetValue).length;
  return Math.round((completed / goals.length) * 100);
}

/**
 * A single goal's own fill percentage (currentValue against targetValue),
 * clamped to [0, 100]. Distinct from computeGoalCompletionPercent above,
 * which counts how many goals in a *list* are fully done — this is the
 * per-goal progress-bar value (also used to score the Battle goal_progress
 * metric, one goal at a time). targetValue <= 0 is treated as 0%, never
 * divide by zero.
 */
export function computeGoalFillPercent(goal: {
  targetValue: number;
  currentValue: number;
}): number {
  if (goal.targetValue <= 0) return 0;
  return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
}

export type TrendDirection = "up" | "down" | "flat";

/** How `currentSeconds` compares to `previousSeconds`, for "vs last week" copy. */
export function compareToPrevious(
  currentSeconds: number,
  previousSeconds: number,
): { deltaSeconds: number; direction: TrendDirection } {
  const deltaSeconds = currentSeconds - previousSeconds;
  const direction: TrendDirection =
    deltaSeconds > 0 ? "up" : deltaSeconds < 0 ? "down" : "flat";
  return { deltaSeconds, direction };
}
