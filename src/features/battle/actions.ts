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
  const result = createBattleFormSchema.safeParse(values);
  if (!result.success) {
    // Server Action errors only carry `.message` across to the client — a
    // raw ZodError here would show up as unreadable JSON in the UI.
    throw new Error("입력값을 확인해주세요.");
  }
  const parsed = result.data;

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

  const durationDays = Number(parsed.durationDays);
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationDays * DAY_MS);

  const battle = await prisma.battle.create({
    data: {
      creatorId: user.id,
      metric: parsed.metric,
      durationDays,
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
