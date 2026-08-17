import { formatDateOnly, parseDateOnly } from "@/lib/date";

const DAY_MS = 24 * 60 * 60 * 1000;

export type StreakStats = {
  current: number;
  longest: number;
  /** "YYYY-MM-DD" of the most recent study day, or null if the user never studied. */
  lastStudyDate: string | null;
};

/**
 * Current + longest streak from a set of "YYYY-MM-DD" study-day strings
 * (duplicates allowed; one per StudySession row is fine). `todayStr` is the
 * caller's "today" in the user's timezone (see getZonedDateString) — passed
 * in rather than computed here so this stays a pure, easily-testable function.
 *
 * Streak definition: a day counts if it has at least one StudySession with
 * durationSec > 0. The current streak tolerates "not yet studied today" (it
 * still counts yesterday's run) but breaks the moment a full day is skipped.
 */
export function computeStreakStats(studyDates: string[], todayStr: string): StreakStats {
  const uniqueDates = Array.from(new Set(studyDates)).sort();
  if (uniqueDates.length === 0) return { current: 0, longest: 0, lastStudyDate: null };

  const toDayIndex = (dateStr: string) =>
    Math.floor(parseDateOnly(dateStr).getTime() / DAY_MS);
  const fromDayIndex = (index: number) => formatDateOnly(new Date(index * DAY_MS));

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const gap = toDayIndex(uniqueDates[i]!) - toDayIndex(uniqueDates[i - 1]!);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const dateSet = new Set(uniqueDates);
  let current = 0;
  let cursor = toDayIndex(todayStr);
  if (!dateSet.has(fromDayIndex(cursor))) cursor -= 1;
  while (dateSet.has(fromDayIndex(cursor))) {
    current += 1;
    cursor -= 1;
  }

  return { current, longest, lastStudyDate: uniqueDates[uniqueDates.length - 1]! };
}
