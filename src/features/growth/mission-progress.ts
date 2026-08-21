import "server-only";
import type { Prisma, StudyMission } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getTodayRange, getZonedDateString } from "@/lib/date";
import { awardXp, XP_AMOUNTS } from "@/features/growth/xp";
import {
  ACTIVE_MISSION_STATUSES,
  hasAutomaticProgress,
  type MissionType,
} from "@/features/growth/mission-types";

/**
 * Mission progress/completion engine — the only place StudyMission.currentValue
 * or .status changes. Called either automatically (from the existing
 * StudySession/ProblemAttempt/Review hooks, never from client input) or via
 * the explicit completeMission Server Action (for CUSTOM missions with no
 * automatic source). Every write path funnels through progressOneMission or
 * completeMissionManually below so the completion+XP-reward step can only
 * ever happen once, guarded the same way in both.
 */

/**
 * Advance every one of a user's ACTIVE missions of `type` by `delta` (real,
 * server-measured progress only — e.g. minutes actually studied). A no-op
 * when the user has no matching mission, so this is always safe to call from
 * every relevant hook regardless of whether Growth/Missions are in use.
 */
export async function progressMissionsByType(
  userId: string,
  type: MissionType,
  delta: number,
  timezone: string,
): Promise<void> {
  if (delta <= 0) return;

  const missions = await prisma.studyMission.findMany({
    where: { userId, type, status: { in: ACTIVE_MISSION_STATUSES } },
    select: { id: true },
  });
  for (const { id } of missions) {
    await progressOneMission(id, delta, timezone);
  }
}

async function progressOneMission(missionId: string, delta: number, timezone: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Atomic DB-level increment (same "increment, then correct" pattern as
    // goals/actions.ts's incrementGoalProgress) guarded by a status filter —
    // updateMany (not update) so a mission another request already completed
    // in the meantime is left untouched (count 0) instead of being re-opened.
    const { count } = await tx.studyMission.updateMany({
      where: { id: missionId, status: { in: ACTIVE_MISSION_STATUSES } },
      data: { currentValue: { increment: delta } },
    });
    if (count === 0) return;

    const mission = await tx.studyMission.findUniqueOrThrow({ where: { id: missionId } });

    if (mission.currentValue >= mission.targetValue) {
      await completeMissionInTx(tx, mission, timezone);
    } else if (mission.status === "PENDING") {
      await tx.studyMission.update({ where: { id: missionId }, data: { status: "IN_PROGRESS" } });
    }
  });
}

/** Clamps to targetValue, marks COMPLETED, awards the mission's captured
 * xpReward, and checks the daily all-missions bonus — all within the
 * caller's transaction. */
async function completeMissionInTx(
  tx: Prisma.TransactionClient,
  mission: StudyMission,
  timezone: string,
): Promise<void> {
  await tx.studyMission.update({
    where: { id: mission.id },
    data: {
      currentValue: mission.targetValue,
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
  await awardXp(
    {
      userId: mission.userId,
      type: "MISSION_COMPLETED",
      amount: mission.xpReward,
      sourceId: mission.id,
    },
    tx,
  );
  await maybeAwardAllMissionsBonus(tx, mission.userId, timezone);
}

/**
 * +100 XP once per day when every mission due TODAY is COMPLETED. Scope is
 * intentionally narrow (only missions with dueAt set to today) rather than
 * "every mission the user has ever created" — a mission with no due date, or
 * due on a different day, doesn't count toward or block today's bonus.
 * Idempotent via the date-keyed sourceId (see GrowthXpEvent's unique
 * constraint), so re-checking after each of several missions completing on
 * the same day only ever grants it once.
 */
async function maybeAwardAllMissionsBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  timezone: string,
): Promise<void> {
  const { start, end } = getTodayRange(timezone);
  const todaysMissions = await tx.studyMission.findMany({
    where: { userId, dueAt: { gte: start, lt: end } },
    select: { status: true },
  });
  if (todaysMissions.length === 0) return;
  if (!todaysMissions.every((m) => m.status === "COMPLETED")) return;

  const dateKey = getZonedDateString(new Date(), timezone);
  await awardXp(
    {
      userId,
      type: "ALL_MISSIONS_BONUS",
      amount: XP_AMOUNTS.ALL_MISSIONS_BONUS,
      sourceId: `all-missions:${dateKey}`,
    },
    tx,
  );
}

export type CompleteMissionResult = {
  mission: StudyMission;
  /** false when the mission was already COMPLETED (by this call or a
   * concurrent one) — a safe, idempotent no-op, not an error. */
  wasJustCompleted: boolean;
};

/**
 * Explicit manual completion — for CUSTOM (and any other) mission with no
 * automatic progress source. Idempotent and race-safe: a guarded updateMany
 * (not a plain update) means at most one of several concurrent calls can
 * actually flip PENDING/IN_PROGRESS -> COMPLETED; every other call (including
 * a genuine "it's already done" request) observes count 0 and returns the
 * current row instead of re-awarding XP.
 */
export async function completeMissionManually(
  userId: string,
  missionId: string,
  timezone: string,
): Promise<CompleteMissionResult | null> {
  return prisma.$transaction(async (tx) => {
    const mission = await tx.studyMission.findFirst({ where: { id: missionId, userId } });
    if (!mission) return null;

    if (mission.status === "COMPLETED") {
      return { mission, wasJustCompleted: false };
    }

    // Missions with an automatic progress source (STUDY_TIME/PROBLEM_COUNT/
    // REVIEW_COUNT) are only ever completed by progressOneMission above, from
    // real measured activity. Allowing this explicit, user-triggered path to
    // complete them too would let a user create e.g. a STUDY_TIME mission and
    // instantly claim its XP without studying at all — CUSTOM/GOAL missions
    // have no automatic source, so this is their only route to COMPLETED.
    if (hasAutomaticProgress(mission.type as MissionType)) {
      return { mission, wasJustCompleted: false };
    }

    const { count } = await tx.studyMission.updateMany({
      where: { id: missionId, userId, status: { in: ACTIVE_MISSION_STATUSES } },
      data: { currentValue: mission.targetValue, status: "COMPLETED", completedAt: new Date() },
    });
    if (count === 0) {
      // Lost a race to a concurrent completion (or it was cancelled/expired
      // in between our read and write) — reflect the current state, no XP:
      // this call did not do the completing, regardless of the outcome.
      const fresh = await tx.studyMission.findUniqueOrThrow({ where: { id: missionId } });
      return { mission: fresh, wasJustCompleted: false };
    }

    await awardXp(
      { userId, type: "MISSION_COMPLETED", amount: mission.xpReward, sourceId: mission.id },
      tx,
    );
    await maybeAwardAllMissionsBonus(tx, userId, timezone);

    const updated = await tx.studyMission.findUniqueOrThrow({ where: { id: missionId } });
    return { mission: updated, wasJustCompleted: true };
  });
}
