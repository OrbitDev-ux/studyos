import { prisma } from "@/lib/prisma";
import { deriveOnlineStatus, type OnlineStatus } from "@/features/profile/presence";

/**
 * The friend relationship between the viewer and a target user, derived from
 * the existing Friendship table (no new state). Drives which action buttons a
 * profile card shows.
 */
export type FriendStatus =
  | { kind: "self" }
  | { kind: "none" }
  | { kind: "outgoing"; friendshipId: string } // viewer sent a pending request
  | { kind: "incoming"; friendshipId: string } // viewer received a pending request
  | { kind: "friends"; friendshipId: string };

export async function getFriendStatus(
  viewerId: string,
  targetId: string,
): Promise<FriendStatus> {
  if (viewerId === targetId) return { kind: "self" };

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: viewerId },
      ],
    },
  });
  if (!friendship) return { kind: "none" };
  if (friendship.status === "accepted") {
    return { kind: "friends", friendshipId: friendship.id };
  }
  return friendship.requesterId === viewerId
    ? { kind: "outgoing", friendshipId: friendship.id }
    : { kind: "incoming", friendshipId: friendship.id };
}

/** Accepted-friend count. Computed from Friendship — never stored/duplicated. */
export function getFriendCount(userId: string): Promise<number> {
  return prisma.friendship.count({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/** The current user's own profile (includes private fields like email/joinedAt
 * that the public view must never expose). */
export async function getMyProfile(userId: string) {
  const [user, friendCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    getFriendCount(userId),
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    bio: user.bio,
    createdAt: user.createdAt,
    onlineStatus: "ONLINE" as OnlineStatus, // you are, by definition, online
    friendCount,
  };
}

export type PublicProfile = {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  createdAt: Date;
  onlineStatus: OnlineStatus;
  friendCount: number;
  friendStatus: FriendStatus;
};

/**
 * A target user's public profile for the profile card. Returns only fields that
 * are safe to expose to another user — deliberately no email, password, tokens,
 * IP, or auth data. Returns null for a banned/nonexistent user so the viewer
 * cannot see or act on them (existing ban policy).
 */
export async function getPublicProfile(
  viewerId: string,
  targetId: string,
): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      createdAt: true,
      lastSeenAt: true,
      bannedAt: true,
    },
  });
  // Banned accounts are hidden from other users, matching how requireCurrentUser
  // gates them out of the app entirely.
  if (!user || user.bannedAt) return null;

  const [friendCount, friendStatus] = await Promise.all([
    getFriendCount(targetId),
    getFriendStatus(viewerId, targetId),
  ]);

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    bio: user.bio,
    createdAt: user.createdAt,
    onlineStatus: deriveOnlineStatus(user.lastSeenAt),
    friendCount,
    friendStatus,
  };
}
