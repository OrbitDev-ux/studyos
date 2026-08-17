const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for the given instant, as seen in `timeZone`. */
export function getZonedDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Converts a wall-clock "YYYY-MM-DDTHH:mm:ss" in `timeZone` to a UTC Date. */
function zonedTimeToUtc(localDateTime: string, timeZone: string): Date {
  const asUtc = new Date(`${localDateTime}Z`);
  const tzString = asUtc.toLocaleString("en-US", { timeZone });
  const utcString = asUtc.toLocaleString("en-US", { timeZone: "UTC" });
  const offset = new Date(utcString).getTime() - new Date(tzString).getTime();
  return new Date(asUtc.getTime() + offset);
}

/** The [start, end) UTC instant range covering "today" in `timeZone`. Use for DateTime columns. */
export function getTodayRange(timeZone: string, now = new Date()) {
  const todayStr = getZonedDateString(now, timeZone);
  const start = zonedTimeToUtc(`${todayStr}T00:00:00`, timeZone);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
}

/** UTC instant of the first day 00:00 of the current month in `timeZone`. Use as
 * the start of a monthly usage window (e.g. plan mock-exam limits). */
export function getMonthStart(timeZone: string, now = new Date()): Date {
  const todayStr = getZonedDateString(now, timeZone); // YYYY-MM-DD in tz
  const firstOfMonth = `${todayStr.slice(0, 7)}-01`; // YYYY-MM-01
  return zonedTimeToUtc(`${firstOfMonth}T00:00:00`, timeZone);
}

/** The [start, end) UTC instant range covering the last `days` days ending today, in `timeZone`. */
export function getRecentRange(timeZone: string, days: number, now = new Date()) {
  const { end } = getTodayRange(timeZone, now);
  const start = new Date(end.getTime() - days * DAY_MS);
  return { start, end };
}

/**
 * Inclusive [startDate, endDate] date-only range spanning the last `days`
 * days ending today, in `timeZone`. Use for `@db.Date` columns — comparing
 * one against `getRecentRange`'s instant boundaries silently drops a day:
 * Prisma serializes a `@db.Date` filter by its UTC calendar date only, so an
 * instant like "today 15:00 UTC" collapses to "today", excluding rows dated
 * exactly today from a `lt` bound that was meant to include all of today.
 */
export function getRecentDateOnlyRange(timeZone: string, days: number, now = new Date()) {
  const endDate = getZonedDateOnly(timeZone, now);
  const startDate = new Date(endDate.getTime() - (days - 1) * DAY_MS);
  return { startDate, endDate };
}

/** Parses a "YYYY-MM-DD" string into a UTC-midnight Date for `@db.Date` columns. */
export function parseDateOnly(dateStr: string): Date {
  const parts = dateStr.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a `@db.Date` value back to "YYYY-MM-DD" (safe: already UTC midnight). */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Ascending "YYYY-MM-DD" strings for the last `days` calendar days in
 * `timeZone`, ending with today. Use to build fixed day buckets for
 * statistics (weekly/monthly trend) so days with zero activity still appear.
 */
export function getLastNDateStrings(
  timeZone: string,
  days: number,
  now = new Date(),
): string[] {
  const todayStr = getZonedDateString(now, timeZone);
  const today = parseDateOnly(todayStr);
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    result.push(formatDateOnly(new Date(today.getTime() - i * DAY_MS)));
  }
  return result;
}

/**
 * "Today" as a UTC-midnight Date matching the calendar date in `timeZone`.
 * Use for `@db.Date` columns (Todo.dueDate, Goal.date) — Postgres DATE has no
 * timezone, so the value must already carry the right calendar date in UTC.
 */
export function getZonedDateOnly(timeZone: string, now = new Date()): Date {
  return parseDateOnly(getZonedDateString(now, timeZone));
}

/** Long "month day, weekday" for the given `timeZone`, in the caller's locale. */
export function formatLongDate(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/** Short "month day" for a `@db.Date` value (already UTC midnight), in the
 * caller's locale. */
export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}

const RELATIVE_TIME_UNITS: {
  limitMs: number;
  unit: Intl.RelativeTimeFormatUnit;
  divisorMs: number;
}[] = [
  { limitMs: 60_000, unit: "second", divisorMs: 1_000 },
  { limitMs: 3_600_000, unit: "minute", divisorMs: 60_000 },
  { limitMs: 86_400_000, unit: "hour", divisorMs: 3_600_000 },
  { limitMs: 2_592_000_000, unit: "day", divisorMs: 86_400_000 }, // < 30 days
  { limitMs: 31_536_000_000, unit: "month", divisorMs: 2_592_000_000 }, // < 365 days
];

/**
 * "3 minutes ago" style relative time — used by the notification list
 * (features/notifications), which has no other need for a locale-aware
 * "time ago" formatter elsewhere in the app. Falls back to `formatShortDate`
 * once the gap is a year or more (a relative "11 months ago" stops being
 * useful; an absolute date is clearer).
 */
export function formatRelativeTime(date: Date, locale: string, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 5_000)
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const { limitMs, unit, divisorMs } of RELATIVE_TIME_UNITS) {
    if (diffMs < limitMs) {
      return rtf.format(-Math.floor(diffMs / divisorMs), unit);
    }
  }
  return formatShortDate(date, locale);
}
