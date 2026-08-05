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

/**
 * "Today" as a UTC-midnight Date matching the calendar date in `timeZone`.
 * Use for `@db.Date` columns (Todo.dueDate, Goal.date) — Postgres DATE has no
 * timezone, so the value must already carry the right calendar date in UTC.
 */
export function getZonedDateOnly(timeZone: string, now = new Date()): Date {
  const parts = getZonedDateString(now, timeZone).split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatKoreanDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}
