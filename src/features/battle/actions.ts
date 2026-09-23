"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  createBattleFormSchema,
  type CreateBattleFormValues,
} from "@/features/battle/schema";
import { createNotification, createNotifications, markAsReadByTarget } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createBattle(values: CreateBattleFormValues): Promise<string> {
  const user = await requireCurrentUser();
  const result = createBattleFormSchema.safeParse(values);
  if (!result.success) {
    // Server Action errors only carry `.message` across to the client — a
    // raw ZodError here would show up as unreadable JSON in the UI.
    throw new Error("입력값을 확인해주세요.");
  }
  const parsed = result.data;
  const friendships = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
    select: { requesterId: true, addresseeId: true },
  });

  const friendIds = new Set(
    friendships.map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId)),
  );
  if (parsed.friendUserIds.some((id) => !friendIds.has(id))) {
    throw new Error("친구가 아닌 사용자는 초대할 수 없습니다.");
  }

  const durationDays = Number(parsed.durationDays);
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationDays * DAY_MS);
  const battleId = randomUUID();

  // One transaction: Battle + all participants commit or roll back together,
  // so no partial participant list can land (the old Supabase path had to
  // delete the Battle row manually as best-effort cleanup on a failed
  // participant insert).
  await prisma.$transaction(async (tx) => {
    await tx.battle.create({
      data: {
        id: battleId,
        creatorId: user.id,
        metric: parsed.metric,
        durationDays,
        startAt,
        endAt,
      },
    });

    await tx.battleParticipant.createMany({
      data: [
        { id: randomUUID(), battleId, userId: user.id, status: "accepted" },
        ...parsed.friendUserIds.map((friendId) => ({
          id: randomUUID(),
          battleId,
          userId: friendId,
          status: "invited",
        })),
      ],
    });
  });

  const actorName = user.name ?? user.email ?? "";
  await createNotifications(
    parsed.friendUserIds.map((friendId) => ({
      userId: friendId,
      type: "battle_invite" as const,
      title: `${actorName}님이 배틀에 초대했어요`,
      actorId: user.id,
      targetUrl: `/battle/${battleId}`,
      metadata: { actorName, battleId },
    })),
  );

  revalidatePath("/battle");
  return battleId;
}

export async function respondToBattleInvite(battleId: string, accept: boolean) {
  const user = await requireCurrentUser();

  const participant = await prisma.battleParticipant.findFirst({
    where: { battleId, userId: user.id, status: "invited" },
    select: { id: true },
  });
  if (!participant) return;

  await prisma.battleParticipant.update({
    where: { id: participant.id },
    data: { status: accept ? "accepted" : "declined" },
  });

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    select: { creatorId: true },
  });
  if (battle) {
    const actorName = user.name ?? user.email ?? "";
    await createNotification({
      userId: battle.creatorId,
      type: "battle_invite_response",
      title: accept ? `${actorName}님이 배틀 초대를 수락했어요` : `${actorName}님이 배틀 초대를 거절했어요`,
      actorId: user.id,
      targetUrl: `/battle/${battleId}`,
      metadata: { actorName, battleId, accepted: accept },
    });
  }
  await markAsReadByTarget(
    user.id,
    "battle_invite",
    (metadata) =>
      !!metadata && typeof metadata === "object" && (metadata as { battleId?: unknown }).battleId === battleId,
  );

  revalidatePath("/battle");
  revalidatePath(`/battle/${battleId}`);
}

/**
 * An accepted participant drops out early. Sets their own row to "left"
 * rather than deleting it — getBattle's leaderboard already filters to
 * status === "accepted", so a "left" participant disappears from scoring
 * for free, with no query changes needed elsewhere. Scoped to (battleId,
 * userId, status: accepted) so this can never touch another participant's
 * row, and a no-op for the creator (see cancelBattle instead — the
 * creator leaving isn't well-defined the same way since creatorId lives on
 * the Battle row itself, not the participant list).
 */
export async function leaveBattle(battleId: string) {
  const user = await requireCurrentUser();

  const battle = await prisma.battle.findUnique({
    where: { id: battleId },
    select: { creatorId: true },
  });
  if (!battle || battle.creatorId === user.id) return;

  await prisma.battleParticipant.updateMany({
    where: { battleId, userId: user.id, status: "accepted" },
    data: { status: "left" },
  });

  revalidatePath("/battle");
  revalidatePath(`/battle/${battleId}`);
}

/**
 * Creator-only: ends the battle outright. Deletes the Battle row, which
 * cascades to BattleParticipant at the DB level (onDelete: Cascade).
 */
export async function cancelBattle(battleId: string) {
  const user = await requireCurrentUser();

  await prisma.battle.deleteMany({
    where: { id: battleId, creatorId: user.id },
  });

  revalidatePath("/battle");
  revalidatePath(`/battle/${battleId}`);
}
