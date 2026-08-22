import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

/**
 * Blocking is meant to end the relationship outright (not just gate future
 * requests), and sendFriendRequest must refuse a blocked relationship in
 * EITHER direction. No test coverage existed for this file before.
 */
const { friendship, blockedUser, conversationParticipant, message, transaction } = vi.hoisted(
  () => {
    const message = { count: vi.fn(), create: vi.fn(), findFirst: vi.fn() };
    return {
      friendship: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
      blockedUser: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
      conversationParticipant: { findUnique: vi.fn() },
      message,
      transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    };
  },
);
vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship,
    blockedUser,
    conversationParticipant,
    message,
    conversation: { update: vi.fn().mockResolvedValue({}) },
    $transaction: transaction,
  },
}));

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

import { blockUser, sendFriendRequest, sendMessage, unblockUser } from "@/features/social/actions";

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

const CONVERSATION_ID = "conv-1";

describe("sendMessage", () => {
  beforeEach(() => {
    conversationParticipant.findUnique.mockResolvedValue({
      conversation: { participants: [{ userId: USER.id }, { userId: TARGET_ID }] },
    });
    message.count.mockResolvedValue(0);
    message.create.mockResolvedValue({ id: "msg-new" });
    message.findFirst.mockResolvedValue(null);
  });

  it("throws when the caller isn't a participant of the conversation", async () => {
    conversationParticipant.findUnique.mockResolvedValue(null);

    await expect(sendMessage(CONVERSATION_ID, "hi")).rejects.toThrow(
      "대화에 참여하고 있지 않습니다.",
    );
  });

  it("enforces a rate limit on rapid sends", async () => {
    message.count.mockResolvedValue(15);

    await expect(sendMessage(CONVERSATION_ID, "hi")).rejects.toThrow(
      "메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.",
    );
    expect(message.create).not.toHaveBeenCalled();
  });

  it("only attaches replyToId when the target message is a real message in THIS conversation", async () => {
    // A messageId from a DIFFERENT conversation (or one that doesn't exist)
    // must never be attached — otherwise a client could reference an
    // arbitrary message id and have its content rendered as a reply preview
    // regardless of which conversation it actually belongs to.
    message.findFirst.mockResolvedValue(null);

    await sendMessage(CONVERSATION_ID, "hi", "someone-elses-message");

    expect(message.findFirst).toHaveBeenCalledWith({
      where: { id: "someone-elses-message", conversationId: CONVERSATION_ID },
      select: { id: true },
    });
    expect(message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ replyToId: null }) }),
    );
  });

  it("attaches replyToId when the target message is real and in this conversation", async () => {
    message.findFirst.mockResolvedValue({ id: "msg-1" });

    await sendMessage(CONVERSATION_ID, "hi", "msg-1");

    expect(message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ replyToId: "msg-1" }) }),
    );
  });

  it("sends normally with no reply target", async () => {
    await sendMessage(CONVERSATION_ID, "hello");

    expect(message.create).toHaveBeenCalledWith({
      data: {
        conversationId: CONVERSATION_ID,
        senderId: USER.id,
        content: "hello",
        replyToId: null,
        sharedType: null,
        sharedId: null,
      },
    });
  });
});
