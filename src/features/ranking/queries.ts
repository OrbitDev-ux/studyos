import type { Prisma } from "@/generated/prisma/client";
import { getFriendUserIds } from "@/features/social/queries";
import { getRecentRange, getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type RankingEntry = {
  userId: string;
  name: string | null;
  image: string | null;
  totalSeconds: number;
  rank: number;
};

/**
 * Ranking is always computed from StudySession at read time (no stored Rank
 * table), same "avoid stale cache" call as Statistics in the original MVP.
 * No `take` here — the full scoped list is cheap at this app's scale, and
 * having it all lets the UI show "내 순위" even when it falls outside the
 * top N without a second query.
 *
 * The user lookup below runs through the Supabase SDK; the aggregation
 * itself is still Prisma — PostgREST has no GROUP BY equivalent for
 * @supabase/supabase-js (would need a Postgres view or an RPC function),
 * which is its own decision outside the profiles/User slice this was
 * converted for.
 */
async function buildRanking(
  where: Prisma.StudySessionWhereInput,
): Promise<RankingEntry[]> {
  const grouped = await prisma.studySession.groupBy({
    by: ["userId"],
    where,
    _sum: { durationSec: true },
    orderBy: { _sum: { durationSec: "desc" } },
  });
  if (grouped.length === 0) return [];

  const supabase = await createClient();
  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, image")
    .in(
      "id",
      grouped.map((g) => g.userId),
    );
  if (error) throw error;
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const entries: RankingEntry[] = [];
  grouped.forEach((group, index) => {
    const user = userById.get(group.userId);
    if (!user) return;
    entries.push({
      userId: user.id,
      name: user.name,
      image: user.image,
      totalSeconds: group._sum.durationSec ?? 0,
      rank: index + 1,
    });
  });
  return entries;
}

/** Calendar-month boundary shared by every viewer, so a "season" leaderboard
 * means the same window for everyone comparing scores — not each viewer's
 * own local month. */
function getCurrentSeasonRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export function getGlobalRanking(): Promise<RankingEntry[]> {
  return buildRanking({});
}

export async function getFriendRanking(userId: string): Promise<RankingEntry[]> {
  const friendIds = await getFriendUserIds(userId);
  return buildRanking({ userId: { in: [userId, ...friendIds] } });
}

export type FriendRankingRange = "today" | "week";

/**
 * Friend comparison scoped to "today" or "the last 7 days", in the viewer's
 * own timezone — same computed-at-read-time buildRanking() as the other
 * ranking scopes, just with a narrower StudySession.startedAt window. Not
 * gated by activitySharingEnabled (features/social/activity's opt-out): this
 * reuses the existing, always-on friend ranking, which had no visibility
 * toggle before this feature either — scope kept intentionally unchanged.
 */
export async function getFriendRankingForRange(
  userId: string,
  range: FriendRankingRange,
  timezone: string,
): Promise<RankingEntry[]> {
  const friendIds = await getFriendUserIds(userId);
  const { start } =
    range === "today" ? getTodayRange(timezone) : getRecentRange(timezone, 7);
  return buildRanking({
    userId: { in: [userId, ...friendIds] },
    startedAt: { gte: start },
  });
}

/** `null` means the user hasn't set a school yet — distinct from an empty ranking. */
export async function getSchoolRanking(userId: string): Promise<RankingEntry[] | null> {
  const supabase = await createClient();
  const { data: user, error } = await supabase
    .from("User")
    .select("school")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (!user.school) return null;

  const { data: schoolmates, error: schoolmatesError } = await supabase
    .from("User")
    .select("id")
    .eq("school", user.school);
  if (schoolmatesError) throw schoolmatesError;

  return buildRanking({ userId: { in: (schoolmates ?? []).map((u) => u.id) } });
}

export function getSeasonRanking(): Promise<RankingEntry[]> {
  const { start, end } = getCurrentSeasonRange();
  return buildRanking({ startedAt: { gte: start, lt: end } });
}
