"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { createNotification } from "@/features/notifications/service";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { updateProfileSchema } from "@/features/profile/schema";
import {
  getPublicProfile,
  type PublicProfile,
} from "@/features/profile/queries";

/**
 * Update the CURRENT user's own profile. Authorization is implicit and
 * non-forgeable: the row updated is always `user.id` from the session — there
 * is no userId parameter a client could tamper with, so a user can only ever
 * edit their own profile. All fields are re-validated server-side.
 */
export async function updateProfile(input: {
  nickname: string;
  bio?: string;
  avatarUrl?: string;
}) {
  const user = await requireCurrentUser();
  const parsed = updateProfileSchema.parse({
    nickname: input.nickname,
    bio: input.bio ?? "",
    avatarUrl: input.avatarUrl ?? "",
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.nickname,
      bio: parsed.bio ? parsed.bio : null,
      image: parsed.avatarUrl ? parsed.avatarUrl : null,
    },
  });

  // A profile change (nickname/avatar) is cross-cutting: it shows in the
  // sidebar, chat lists, conversation headers and profile cards. Revalidate the
  // whole app layout so every server-rendered surface picks up the new values.
  revalidatePath("/", "layout");
}

/**
 * Presence heartbeat. Called periodically by the client while a tab is visible;
 * updates `lastSeenAt` so the user reads as ONLINE. Deliberately does not
 * revalidate anything — it must be cheap and side-effect-free on the UI.
 */
export async function touchPresence() {
  const user = await requireCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
}

/** Fetch a target user's public profile for the profile card (client-invoked
 * on open). Requires an authenticated viewer; returns null for banned/unknown
 * users. Never returns sensitive fields (see getPublicProfile). */
export async function fetchPublicProfile(
  targetId: string,
): Promise<PublicProfile | null> {
  const user = await requireCurrentUser();
  return getPublicProfile(user.id, targetId);
}

/**
 * Send a friend request from a profile card. Same Friendship semantics as the
 * email-based sendFriendRequest (features/social/actions), but keyed by userId
 * since a public profile never exposes email. Blocks self-requests, banned
 * targets, and duplicate/racing requests.
 */
export async function requestFriendByUserId(targetId: string) {
  const user = await requireCurrentUser();
  if (targetId === user.id) {
    throw new Error("자기 자신에게는 친구 요청을 보낼 수 없습니다.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, bannedAt: true },
  });
  if (!target || target.bannedAt) {
    throw new Error("사용자를 찾을 수 없습니다.");
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
      title: `${actorName}님이 친구 요청을 보냈어요`,
      actorId: user.id,
      targetUrl: "/social",
      metadata: { actorName, friendshipId: friendship.id },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("이미 요청을 주고받았습니다.");
    }
    throw err;
  }

  revalidatePath("/social");
  revalidatePath("/profile");
}
