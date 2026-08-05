"use server";

import { revalidatePath } from "next/cache";
import { addFriendFormSchema } from "@/features/social/schema";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export async function sendFriendRequest(email: string) {
  const user = await requireCurrentUser();
  const { email: targetEmail } = addFriendFormSchema.parse({ email });

  if (targetEmail === user.email?.toLowerCase()) {
    throw new Error("자기 자신에게는 친구 요청을 보낼 수 없습니다.");
  }

  const target = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!target) {
    throw new Error("해당 이메일의 사용자를 찾을 수 없습니다.");
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: user.id },
      ],
    },
  });
  if (existing) {
    throw new Error(
      existing.status === "accepted" ? "이미 친구입니다." : "이미 요청을 주고받았습니다.",
    );
  }

  try {
    await prisma.friendship.create({
      data: { requesterId: user.id, addresseeId: target.id, status: "pending" },
    });
  } catch (err) {
    // Concurrent double-submit can race past the findFirst check above and
    // hit the @@unique([requesterId, addresseeId]) constraint — treat it the
    // same as the pre-check duplicate instead of leaking a raw Prisma error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("이미 요청을 주고받았습니다.");
    }
    throw err;
  }

  revalidatePath("/social");
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const user = await requireCurrentUser();
  const friendship = await prisma.friendship.findFirst({
    where: { id: friendshipId, addresseeId: user.id, status: "pending" },
  });
  if (!friendship) return;

  if (accept) {
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "accepted" },
    });
  } else {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }

  revalidatePath("/social");
}

export async function removeFriend(friendshipId: string) {
  const user = await requireCurrentUser();
  await prisma.friendship.deleteMany({
    where: {
      id: friendshipId,
      status: "accepted",
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
  });
  revalidatePath("/social");
}

export async function startConversation(friendUserId: string): Promise<string> {
  const user = await requireCurrentUser();

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: user.id, addresseeId: friendUserId },
        { requesterId: friendUserId, addresseeId: user.id },
      ],
    },
  });
  if (!friendship) throw new Error("친구가 아닙니다.");

  const candidates = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: { participants: true },
  });
  const existing = candidates.find(
    (conversation) =>
      conversation.participants.length === 2 &&
      conversation.participants.some(
        (participant) => participant.userId === friendUserId,
      ),
  );
  if (existing) return existing.id;

  const conversation = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: user.id }, { userId: friendUserId }] },
    },
  });
  return conversation.id;
}

const MAX_MESSAGE_LENGTH = 1000;

export async function sendMessage(conversationId: string, content: string) {
  const user = await requireCurrentUser();
  const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed) return;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!participant) throw new Error("대화에 참여하고 있지 않습니다.");

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, content: trimmed },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/social/${conversationId}`);
  revalidatePath("/social");
}
