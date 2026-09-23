import type { Prisma } from "@/generated/prisma/client";
import { getFriendUserIds } from "@/features/social/queries";
import { getRecentRange, getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";

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
 */
async function buildRanking(
  where: Prisma.StudySessionWhereInput,
): Promise<RankingEntry[]> {
  const grouped = await prisma.studySession.groupBy({
    by: ["userId"],
    where,
    // Reward-eligible (server-verified) study time only — an unattended open
    // session must never inflate a leaderboard (eligibility.ts).
    _sum: { rewardEligibleDurationSec: true },
    orderBy: { _sum: { rewardEligibleDurationSec: "desc" } },
  });
  if (grouped.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, image: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const entries: RankingEntry[] = [];
  grouped.forEach((group, index) => {
    const user = userById.get(group.userId);
    if (!user) return;
    entries.push({
      userId: user.id,
      name: user.name,
      image: user.image,
      totalSeconds: group._sum.rewardEligibleDurationSec ?? 0,
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { school: true },
  });
  if (!user?.school) return null;

  const schoolmates = await prisma.user.findMany({
    where: { school: user.school },
    select: { id: true },
  });

  return buildRanking({ userId: { in: schoolmates.map((u) => u.id) } });
}

export function getSeasonRanking(): Promise<RankingEntry[]> {
  const { start, end } = getCurrentSeasonRange();
  return buildRanking({ startedAt: { gte: start, lt: end } });
}
