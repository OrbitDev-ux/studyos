"use server";

import { revalidatePath } from "next/cache";
import { addFriendFormSchema } from "@/features/social/schema";
import { Prisma } from "@/generated/prisma/client";
import { createNotification, markAsReadByTarget } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";

/** Match helper for markAsReadByTarget over `friend_request`/DM-shaped metadata. */
function metadataMatches(key: string, value: string) {
  return (metadata: unknown) =>
    !!metadata &&
    typeof metadata === "object" &&
    (metadata as Record<string, unknown>)[key] === value;
}

export async function sendFriendRequest(email: string) {
  const user = await requireCurrentUser();
  const { email: targetEmail } = addFriendFormSchema.parse({ email });

  if (targetEmail === user.email?.toLowerCase()) {
    throw new Error("자기 자신에게는 친구 요청을 보낼 수 없습니다.");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("User")
    .select("id")
    .eq("email", targetEmail)
    .maybeSingle();
  if (!target) {
    throw new Error("해당 이메일의 사용자를 찾을 수 없습니다.");
  }

  // Checked in both directions: a user who was blocked can't re-request, and
  // a user who did the blocking can't accidentally re-request the person
  // they blocked either.
  const block = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: target.id },
        { blockerId: target.id, blockedId: user.id },
      ],
    },
  });
  if (block) {
    throw new Error("차단 관계가 있어 친구 요청을 보낼 수 없습니다.");
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
    const friendship = await prisma.friendship.create({
      data: { requesterId: user.id, addresseeId: target.id, status: "pending" },
    });
    const actorName = user.name ?? user.email ?? "";
    await createNotification({
      userId: target.id,
      type: "friend_request",
      // Fallback for any raw (non-UI) read of this row; the UI itself always
      // renders via resolveNotificationText in the viewer's own locale.
      title: `${actorName}님이 친구 요청을 보냈어요`,
      actorId: user.id,
      targetUrl: "/social",
      metadata: { actorName, friendshipId: friendship.id },
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
    const actorName = user.name ?? user.email ?? "";
    await createNotification({
      userId: friendship.requesterId,
      type: "friend_request_accepted",
      title: `${actorName}님이 친구 요청을 수락했어요`,
      actorId: user.id,
      targetUrl: "/social",
      metadata: { actorName, friendshipId: friendship.id },
    });
  } else {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }

  // The request notification (shown to the addressee, i.e. the current user)
  // is now handled either way — accepting or declining both resolve it.
  await markAsReadByTarget(
    user.id,
    "friend_request",
    metadataMatches("friendshipId", friendshipId),
  );

  revalidatePath("/social");
}

/**
 * Toggle whether the current user's StudySession/Goal activity is visible in
 * their friends' activity feed (features/social/activity). Off by choice only
 * (default true) — authorization is implicit and non-forgeable the same way
 * as updateProfile: the row updated is always `user.id` from the session.
 */
export async function updateActivitySharing(enabled: boolean) {
  const user = await requireCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { activitySharingEnabled: enabled },
  });
  revalidatePath("/settings");
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

/**
 * Blocks `targetUserId` and severs any existing Friendship between the two
 * (pending or accepted) — blocking is meant to end the relationship
 * outright, not just prevent future requests. Idempotent: a repeat block
 * hits the @@unique([blockerId, blockedId]) constraint, treated as a no-op
 * rather than a thrown error.
 */
export async function blockUser(targetUserId: string) {
  const user = await requireCurrentUser();
  if (targetUserId === user.id) return;

  try {
    await prisma.blockedUser.create({
      data: { blockerId: user.id, blockedId: targetUserId },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
      throw err;
    }
  }

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: user.id },
      ],
    },
  });

  revalidatePath("/social");
  revalidatePath("/settings");
}

export async function unblockUser(targetUserId: string) {
  const user = await requireCurrentUser();
  await prisma.blockedUser.deleteMany({
    where: { blockerId: user.id, blockedId: targetUserId },
  });
  revalidatePath("/settings");
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

const NOTIFICATION_PREVIEW_LENGTH = 120;

export async function sendMessage(conversationId: string, content: string) {
  const user = await requireCurrentUser();
  const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!trimmed) return;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    include: { conversation: { include: { participants: true } } },
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

  const actorName = user.name ?? user.email ?? "";
  const preview =
    trimmed.length > NOTIFICATION_PREVIEW_LENGTH
      ? `${trimmed.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…`
      : trimmed;
  const others = participant.conversation.participants.filter(
    (p) => p.userId !== user.id,
  );
  await Promise.all(
    others.map((other) =>
      createNotification({
        userId: other.userId,
        type: "dm_message",
        title: `${actorName}님의 새 메시지`,
        body: preview,
        actorId: user.id,
        targetUrl: `/social/${conversationId}`,
        metadata: { actorName, conversationId },
      }),
    ),
  );

  revalidatePath(`/social/${conversationId}`);
  revalidatePath("/social");
}
