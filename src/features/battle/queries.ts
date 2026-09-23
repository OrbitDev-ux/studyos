import type { Battle, BattleParticipant, User } from "@/generated/prisma/client";
import { computeGoalFillPercent } from "@/features/statistics/aggregate";
import { formatDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

// Hand-typed to match the shape Prisma returns — the privacy narrowing below
// never asks for the full User row.
//
// `user` is deliberately narrowed to the fields this feature actually reads
// (name/email for display, image is unused today but kept for parity with
// other participant lists) — never the full row. getBattles/getBattle only
// ever reach server components, but a full `User(*)` — including the password
// hash — sitting on every participant is exactly the shape that leaked once
// before in this codebase (see social/queries.ts's getReceivedFriendRequests
// doc comment).
type PublicParticipantUser = Pick<User, "id" | "name" | "email" | "image">;
type ParticipantWithUser = BattleParticipant & { user: PublicParticipantUser };
type BattleWithParticipants = Battle & { participants: ParticipantWithUser[] };

/**
 * Score is always computed from the participant's own StudySession/Todo/Goal
 * rows in [startAt, endAt) — see the Battle model's doc comment for why
 * there's no stored score to keep in sync.
 */
async function computeParticipantScore(
  userId: string,
  metric: string,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  if (metric === "study_time") {
    const agg = await prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: startAt, lt: endAt } },
      // Reward-eligible (server-verified) time only — Battle is a competitive
      // surface, so an unattended open session must not score (eligibility.ts).
      _sum: { rewardEligibleDurationSec: true },
    });
    return agg._sum.rewardEligibleDurationSec ?? 0;
  }

  if (metric === "todo_count") {
    return prisma.todo.count({
      where: { userId, completed: true, completedAt: { gte: startAt, lt: endAt } },
    });
  }

  // goal_progress: sum of each goal's completion percentage (capped at 100).
  // Goal.date is a native Postgres DATE column — filter with plain
  // "YYYY-MM-DD" strings rather than full timestamps (see lib/date.ts's
  // getRecentDateOnlyRange doc comment for the date-only discipline).
  const startDate = formatDateOnly(startAt);
  const endDate = formatDateOnly(endAt);
  const goals = await prisma.goal.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    select: { currentValue: true, targetValue: true },
  });
  return goals.reduce((sum, goal) => sum + computeGoalFillPercent(goal), 0);
}

export async function getBattles(userId: string) {
  // Two queries instead of a `some` filter: Prisma's `some` still embeds
  // every participant for every matched battle, while this (mirroring what
  // the old PostgREST `!inner` two-query approach did) first resolves which
  // battles this user is in, then fetches those with their full rosters.
  const myParticipations = await prisma.battleParticipant.findMany({
    where: { userId },
    select: { battleId: true },
  });
  const battleIds = myParticipations.map((p) => p.battleId);
  if (battleIds.length === 0) return [];

  const battles = await prisma.battle.findMany({
    where: { id: { in: battleIds } },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return (battles as unknown as BattleWithParticipants[]).map((battle) => ({
    ...battle,
    isActive: new Date(battle.endAt) > now,
    myStatus: battle.participants.find((p) => p.userId === userId)?.status ?? "invited",
  }));
}

export async function getBattle(battleId: string, userId: string) {
  const myParticipation = await prisma.battleParticipant.findFirst({
    where: { battleId, userId },
    select: { id: true },
  });
  if (!myParticipation) return null;

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });
  if (!battle) return null;

  const battleWithParticipants = battle as unknown as BattleWithParticipants;
  const acceptedParticipants = battleWithParticipants.participants.filter(
    (p) => p.status === "accepted",
  );
  const scored = await Promise.all(
    acceptedParticipants.map(async (participant) => ({
      userId: participant.user.id,
      name: participant.user.name,
      email: participant.user.email,
      image: participant.user.image,
      score: await computeParticipantScore(
        participant.user.id,
        battleWithParticipants.metric,
        new Date(battleWithParticipants.startAt),
        new Date(battleWithParticipants.endAt),
      ),
    })),
  );
  scored.sort((a, b) => b.score - a.score);
  const leaderboard = scored.map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    battle: battleWithParticipants,
    leaderboard,
    pendingInvites: battleWithParticipants.participants.filter(
      (p) => p.status === "invited",
    ),
    isActive: new Date(battleWithParticipants.endAt) > new Date(),
  };
}
