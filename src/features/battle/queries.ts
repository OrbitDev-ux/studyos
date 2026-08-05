import { formatDateOnly, parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

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
    const sessions = await prisma.studySession.findMany({
      where: { userId, startedAt: { gte: startAt, lt: endAt } },
      select: { durationSec: true },
    });
    return sessions.reduce((sum, session) => sum + session.durationSec, 0);
  }

  if (metric === "todo_count") {
    return prisma.todo.count({
      where: { userId, completed: true, completedAt: { gte: startAt, lt: endAt } },
    });
  }

  // goal_progress: sum of each goal's completion percentage (capped at 100).
  // Goal.date is a @db.Date column — must use date-only bounds, not the raw
  // instants above (Prisma truncates a @db.Date filter to its bare UTC
  // calendar date, so comparing it against a mid-day instant silently drops
  // a day; see lib/date.ts's getRecentDateOnlyRange doc comment for the
  // same bug caught earlier in the AI Tutor weekly report).
  const startDate = parseDateOnly(formatDateOnly(startAt));
  const endDate = parseDateOnly(formatDateOnly(endAt));
  const goals = await prisma.goal.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    select: { currentValue: true, targetValue: true },
  });
  return goals.reduce((sum, goal) => {
    if (goal.targetValue <= 0) return sum;
    return sum + Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  }, 0);
}

export async function getBattles(userId: string) {
  const battles = await prisma.battle.findMany({
    where: { participants: { some: { userId } } },
    include: { participants: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  return battles.map((battle) => ({
    ...battle,
    isActive: battle.endAt > now,
    myStatus: battle.participants.find((p) => p.userId === userId)?.status ?? "invited",
  }));
}

export async function getBattle(battleId: string, userId: string) {
  const battle = await prisma.battle.findFirst({
    where: { id: battleId, participants: { some: { userId } } },
    include: { participants: { include: { user: true } } },
  });
  if (!battle) return null;

  const acceptedParticipants = battle.participants.filter((p) => p.status === "accepted");
  const scored = await Promise.all(
    acceptedParticipants.map(async (participant) => ({
      userId: participant.user.id,
      name: participant.user.name,
      email: participant.user.email,
      image: participant.user.image,
      score: await computeParticipantScore(
        participant.user.id,
        battle.metric,
        battle.startAt,
        battle.endAt,
      ),
    })),
  );
  scored.sort((a, b) => b.score - a.score);
  const leaderboard = scored.map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    battle,
    leaderboard,
    pendingInvites: battle.participants.filter((p) => p.status === "invited"),
    isActive: battle.endAt > new Date(),
  };
}
