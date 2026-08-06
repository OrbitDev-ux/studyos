import { getTodayRange, getZonedDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

export async function getActiveStudySession(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("StudySession")
    .select("*")
    .eq("userId", userId)
    .is("endedAt", null)
    .order("startedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // PostgREST returns timestamp columns as strings — Prisma always
  // returned Date instances here, and callers (e.g. the dashboard page)
  // still call .toISOString() on this field, so convert at the boundary.
  return { ...data, startedAt: new Date(data.startedAt) };
}

export async function getTodayStudySeconds(
  userId: string,
  timezone: string,
): Promise<number> {
  const { start, end } = getTodayRange(timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("StudySession")
    .select("durationSec")
    .eq("userId", userId)
    .gte("startedAt", start.toISOString())
    .lt("startedAt", end.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((sum, session) => sum + session.durationSec, 0);
}

const STREAK_LOOKBACK = 500;

export async function getStreak(userId: string, timezone: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("StudySession")
    .select("startedAt")
    .eq("userId", userId)
    .gt("durationSec", 0)
    .order("startedAt", { ascending: false })
    .limit(STREAK_LOOKBACK);
  if (error) throw error;

  const studyDates = new Set(
    (data ?? []).map((s) => getZonedDateString(new Date(s.startedAt), timezone)),
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
