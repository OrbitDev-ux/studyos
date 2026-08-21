import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

/**
 * Blocking is meant to end the relationship outright (not just gate future
 * requests), and sendFriendRequest must refuse a blocked relationship in
 * EITHER direction. No test coverage existed for this file before.
 */
const { friendship, blockedUser } = vi.hoisted(() => ({
  friendship: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  blockedUser: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { friendship, blockedUser } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { createNotification, markAsReadByTarget } = vi.hoisted(() => ({
  createNotification: vi.fn(),
  markAsReadByTarget: vi.fn(),
}));
vi.mock("@/features/notifications/service", () => ({ createNotification, markAsReadByTarget }));

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { blockUser, sendFriendRequest, unblockUser } from "@/features/social/actions";

const USER = { id: "user-1", email: "me@example.com" };
const TARGET_ID = "user-2";

function duplicateBlockError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.0.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: TARGET_ID } }),
        }),
      }),
    }),
  });
});

describe("sendFriendRequest — block guard", () => {
  it("rejects when the target has blocked the caller", async () => {
    blockedUser.findFirst.mockResolvedValue({ blockerId: TARGET_ID, blockedId: USER.id });

    await expect(sendFriendRequest("target@example.com")).rejects.toThrow(
      "차단 관계가 있어 친구 요청을 보낼 수 없습니다.",
    );
    expect(friendship.create).not.toHaveBeenCalled();
  });

  it("rejects when the caller has blocked the target", async () => {
    blockedUser.findFirst.mockResolvedValue({ blockerId: USER.id, blockedId: TARGET_ID });

    await expect(sendFriendRequest("target@example.com")).rejects.toThrow(
      "차단 관계가 있어 친구 요청을 보낼 수 없습니다.",
    );
    expect(friendship.create).not.toHaveBeenCalled();
  });

  it("proceeds normally when there is no block relationship", async () => {
    blockedUser.findFirst.mockResolvedValue(null);
    friendship.findFirst.mockResolvedValue(null);
    friendship.create.mockResolvedValue({ id: "f-1" });

    await sendFriendRequest("target@example.com");

    expect(friendship.create).toHaveBeenCalledWith({
      data: { requesterId: USER.id, addresseeId: TARGET_ID, status: "pending" },
    });
  });
});

describe("blockUser", () => {
  it("creates the block row and removes any existing friendship in either direction", async () => {
    blockedUser.create.mockResolvedValue({});
    friendship.deleteMany.mockResolvedValue({ count: 1 });

    await blockUser(TARGET_ID);

    expect(blockedUser.create).toHaveBeenCalledWith({
      data: { blockerId: USER.id, blockedId: TARGET_ID },
    });
    expect(friendship.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { requesterId: USER.id, addresseeId: TARGET_ID },
          { requesterId: TARGET_ID, addresseeId: USER.id },
        ],
      },
    });
  });

  it("is idempotent — a duplicate block is swallowed, not thrown", async () => {
    blockedUser.create.mockRejectedValue(duplicateBlockError());
    friendship.deleteMany.mockResolvedValue({ count: 0 });

    await expect(blockUser(TARGET_ID)).resolves.toBeUndefined();
  });

  it("rethrows an unexpected DB error", async () => {
    blockedUser.create.mockRejectedValue(new Error("connection refused"));

    await expect(blockUser(TARGET_ID)).rejects.toThrow("connection refused");
  });

  it("no-ops when a user tries to block themselves", async () => {
    await blockUser(USER.id);
    expect(blockedUser.create).not.toHaveBeenCalled();
  });
});

describe("unblockUser", () => {
  it("scopes the delete to the caller as blocker — can't unblock on someone else's behalf", async () => {
    blockedUser.deleteMany.mockResolvedValue({ count: 1 });

    await unblockUser(TARGET_ID);

    expect(blockedUser.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: USER.id, blockedId: TARGET_ID },
    });
  });
});
