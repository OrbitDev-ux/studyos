import "server-only";
import { prisma } from "@/lib/prisma";
import { getFriendUserIds } from "@/features/social/queries";
import { getRecentDateOnlyRange, getRecentRange } from "@/lib/date";

const ACTIVITY_LOOKBACK_DAYS = 7;
const ACTIVITY_LIMIT = 20;

export type FriendActivityItem =
  | {
      kind: "study_session";
      id: string;
      userId: string;
      name: string | null;
      image: string | null;
      subjectName: string | null;
      durationSec: number;
      occurredAt: Date;
    }
  | {
      kind: "goal_completed";
      id: string;
      userId: string;
      name: string | null;
      image: string | null;
      title: string;
      occurredAt: Date;
    };

/**
 * Friend activity feed: recent completed study sessions + completed goals
 * from the viewer's friends, merged newest-first. Computed at read time from
 * existing StudySession/Goal rows — no new Activity table — the same
 * "avoid stale cache" pattern as Ranking/Battle (see their doc comments).
 *
 * Respects each friend's `activitySharingEnabled` opt-out via a relation
 * filter (`user: { activitySharingEnabled: true }`), so a friend who turned
 * off sharing is excluded at the query itself, not filtered client-side.
 *
 * Bounded like `streak.ts`'s STREAK_LOOKBACK: a fixed lookback window + a
 * `take` cap per source table, so a user with many friends/sessions can't
 * turn this into an unbounded scan.
 */
export async function getFriendActivityFeed(
  userId: string,
  timezone: string,
): Promise<FriendActivityItem[]> {
  const friendIds = await getFriendUserIds(userId);
  if (friendIds.length === 0) return [];

  const { start } = getRecentRange(timezone, ACTIVITY_LOOKBACK_DAYS);
  const { startDate } = getRecentDateOnlyRange(timezone, ACTIVITY_LOOKBACK_DAYS);

  const [sessions, goals] = await Promise.all([
    prisma.studySession.findMany({
      where: {
        userId: { in: friendIds },
        user: { activitySharingEnabled: true },
        durationSec: { gt: 0 },
        startedAt: { gte: start },
      },
      select: {
        id: true,
        userId: true,
        durationSec: true,
        startedAt: true,
        subject: { select: { name: true } },
        user: { select: { name: true, image: true } },
      },
      orderBy: { startedAt: "desc" },
      take: ACTIVITY_LIMIT,
    }),
    prisma.goal.findMany({
      where: {
        userId: { in: friendIds },
        user: { activitySharingEnabled: true },
        date: { gte: startDate },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        currentValue: true,
        targetValue: true,
        updatedAt: true,
        user: { select: { name: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: ACTIVITY_LIMIT,
    }),
  ]);

  const sessionItems: FriendActivityItem[] = sessions.map((s) => ({
    kind: "study_session",
    id: s.id,
    userId: s.userId,
    name: s.user.name,
    image: s.user.image,
    subjectName: s.subject?.name ?? null,
    durationSec: s.durationSec,
    occurredAt: s.startedAt,
  }));

  // Goal has no stored "completed" flag/timestamp — a goal counts as an
  // activity item once currentValue reaches targetValue, same threshold as
  // computeGoalCompletionPercent (features/statistics/aggregate). updatedAt
  // is used as the occurred-at approximation since there is no dedicated
  // completedAt column.
  const goalItems: FriendActivityItem[] = goals
    .filter((g) => g.currentValue >= g.targetValue)
    .map((g) => ({
      kind: "goal_completed",
      id: g.id,
      userId: g.userId,
      name: g.user.name,
      image: g.user.image,
      title: g.title,
      occurredAt: g.updatedAt,
    }));

  return [...sessionItems, ...goalItems]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, ACTIVITY_LIMIT);
}
