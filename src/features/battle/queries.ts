import type { Battle, BattleParticipant, User } from "@/generated/prisma/client";
import { computeGoalFillPercent } from "@/features/statistics/aggregate";
import { formatDateOnly } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

// Hand-typed to match what Prisma used to return — the Supabase client has
// no generated DB types wired in, so .from().select() is loosely typed.
//
// `user` is deliberately narrowed to the fields this feature actually reads
// (name/email for display, image is unused today but kept for parity with
// other participant lists) — never the full row. Both getBattles/getBattle
// currently only ever reach server components (Codebase audit confirmed no
// live leak), but a full `User(*)` — including the password hash — sitting
// on every participant is exactly the shape that leaked once before in this
// codebase (see social/queries.ts's getReceivedFriendRequests doc comment).
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
  const supabase = await createClient();

  if (metric === "study_time") {
    const { data, error } = await supabase
      .from("StudySession")
      .select("durationSec")
      .eq("userId", userId)
      .gte("startedAt", startAt.toISOString())
      .lt("startedAt", endAt.toISOString());
    if (error) throw error;
    return (data ?? []).reduce((sum, session) => sum + session.durationSec, 0);
  }

  if (metric === "todo_count") {
    const { count, error } = await supabase
      .from("Todo")
      .select("*", { count: "exact", head: true })
      .eq("userId", userId)
      .eq("completed", true)
      .gte("completedAt", startAt.toISOString())
      .lt("completedAt", endAt.toISOString());
    if (error) throw error;
    return count ?? 0;
  }

  // goal_progress: sum of each goal's completion percentage (capped at 100).
  // Goal.date is a native Postgres DATE column — filter with plain
  // "YYYY-MM-DD" strings rather than full timestamps, the same date-only
  // discipline this codebase already learned the hard way once (see
  // lib/date.ts's getRecentDateOnlyRange doc comment — back then this was
  // a Prisma @db.Date column and a full-precision filter silently dropped
  // a day; going through raw PostgREST now, a bare date string sidesteps
  // any date-vs-timestamp casting ambiguity entirely).
  const startDate = formatDateOnly(startAt);
  const endDate = formatDateOnly(endAt);
  const { data: goals, error: goalError } = await supabase
    .from("Goal")
    .select("currentValue, targetValue")
    .eq("userId", userId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (goalError) throw goalError;
  return (goals ?? []).reduce((sum, goal) => sum + computeGoalFillPercent(goal), 0);
}

export async function getBattles(userId: string) {
  const supabase = await createClient();

  // PostgREST's `!inner` join hint, needed to filter parent rows by an
  // embedded column, also filters the embedded array down to just the
  // matching child row — Prisma's `some` filter doesn't do that (it still
  // embeds every participant). Two queries instead: which battles is this
  // user in, then fetch those battles with all of their participants.
  const { data: myParticipations, error: participationError } = await supabase
    .from("BattleParticipant")
    .select("battleId")
    .eq("userId", userId);
  if (participationError) throw participationError;
  const battleIds = (myParticipations ?? []).map((p) => p.battleId);
  if (battleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("Battle")
    .select("*, participants:BattleParticipant(*, user:User(id,name,email,image))")
    .in("id", battleIds)
    .order("createdAt", { ascending: false });
  if (error) throw error;

  const battles = data as unknown as BattleWithParticipants[];
  const now = new Date();
  return battles.map((battle) => ({
    ...battle,
    isActive: new Date(battle.endAt) > now,
    myStatus: battle.participants.find((p) => p.userId === userId)?.status ?? "invited",
  }));
}

export async function getBattle(battleId: string, userId: string) {
  const supabase = await createClient();

  const { data: myParticipation } = await supabase
    .from("BattleParticipant")
    .select("id")
    .eq("battleId", battleId)
    .eq("userId", userId)
    .maybeSingle();
  if (!myParticipation) return null;

  const { data, error } = await supabase
    .from("Battle")
    .select("*, participants:BattleParticipant(*, user:User(id,name,email,image))")
    .eq("id", battleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const battle = data as unknown as BattleWithParticipants;
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
        new Date(battle.startAt),
        new Date(battle.endAt),
      ),
    })),
  );
  scored.sort((a, b) => b.score - a.score);
  const leaderboard = scored.map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    battle,
    leaderboard,
    pendingInvites: battle.participants.filter((p) => p.status === "invited"),
    isActive: new Date(battle.endAt) > new Date(),
  };
}
