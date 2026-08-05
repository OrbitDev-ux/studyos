"use server";

import { revalidatePath } from "next/cache";
import {
  createBattleFormSchema,
  type CreateBattleFormValues,
} from "@/features/battle/schema";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createBattle(values: CreateBattleFormValues): Promise<string> {
  const user = await requireCurrentUser();
  const parsed = createBattleFormSchema.parse(values);

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [
        { requesterId: user.id, addresseeId: { in: parsed.friendUserIds } },
        { addresseeId: user.id, requesterId: { in: parsed.friendUserIds } },
      ],
    },
  });
  const friendIds = new Set(
    friendships.map((f) => (f.requesterId === user.id ? f.addresseeId : f.requesterId)),
  );
  if (parsed.friendUserIds.some((id) => !friendIds.has(id))) {
    throw new Error("친구가 아닌 사용자는 초대할 수 없습니다.");
  }

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + parsed.durationDays * DAY_MS);

  const battle = await prisma.battle.create({
    data: {
      creatorId: user.id,
      metric: parsed.metric,
      durationDays: parsed.durationDays,
      startAt,
      endAt,
      participants: {
        create: [
          { userId: user.id, status: "accepted" },
          ...parsed.friendUserIds.map((friendId) => ({
            userId: friendId,
            status: "invited",
          })),
        ],
      },
    },
  });

  revalidatePath("/battle");
  return battle.id;
}

export async function respondToBattleInvite(battleId: string, accept: boolean) {
  const user = await requireCurrentUser();
  const participant = await prisma.battleParticipant.findFirst({
    where: { battleId, userId: user.id, status: "invited" },
  });
  if (!participant) return;

  await prisma.battleParticipant.update({
    where: { id: participant.id },
    data: { status: accept ? "accepted" : "declined" },
  });

  revalidatePath("/battle");
  revalidatePath(`/battle/${battleId}`);
}
