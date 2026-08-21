import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These are exactly the security-critical paths section 12 of the messenger
 * spec calls out by name: a message id or emoji from the client is never
 * trusted — ownership/participant-membership is always re-derived from the
 * database inside the action itself, never assumed from what the UI showed.
 */
const { message, messageReaction, conversationParticipant } = vi.hoisted(() => ({
  message: { updateMany: vi.fn(), findUnique: vi.fn() },
  messageReaction: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  conversationParticipant: { updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { message, messageReaction, conversationParticipant } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { searchMessages } = vi.hoisted(() => ({ searchMessages: vi.fn() }));
vi.mock("@/features/social/queries", () => ({ searchMessages }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  deleteMessage,
  editMessage,
  reactToMessage,
  searchConversationMessages,
  setTyping,
} from "@/features/social/message-actions";

const USER = { id: "user-1" };
const MESSAGE_ID = "msg-1";

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("editMessage", () => {
  it("scopes the update to (id, senderId, deletedAt: null) — can't edit someone else's message or a deleted one", async () => {
    message.updateMany.mockResolvedValue({ count: 0 });

    const result = await editMessage(MESSAGE_ID, "new content");

    expect(message.updateMany).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID, senderId: USER.id, deletedAt: null },
      data: { content: "new content", editedAt: expect.any(Date) },
    });
    expect(result.error).toBeDefined();
  });

  it("succeeds when the caller owns the message", async () => {
    message.updateMany.mockResolvedValue({ count: 1 });
    message.findUnique.mockResolvedValue({ conversationId: "conv-1" });

    const result = await editMessage(MESSAGE_ID, "  updated  ");

    expect(result).toEqual({ success: true });
    expect(message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ content: "updated" }) }),
    );
  });

  it("rejects empty content without touching the database", async () => {
    const result = await editMessage(MESSAGE_ID, "   ");
    expect(result.error).toBeDefined();
    expect(message.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleteMessage", () => {
  it("scopes the delete to (id, senderId, deletedAt: null) and clears content — a tombstone, not just a flag", async () => {
    message.updateMany.mockResolvedValue({ count: 1 });
    message.findUnique.mockResolvedValue({ conversationId: "conv-1" });

    await deleteMessage(MESSAGE_ID);

    expect(message.updateMany).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID, senderId: USER.id, deletedAt: null },
      data: { deletedAt: expect.any(Date), content: "" },
    });
  });

  it("no-ops when the caller doesn't own the message (count 0)", async () => {
    message.updateMany.mockResolvedValue({ count: 0 });

    await deleteMessage(MESSAGE_ID);

    expect(message.findUnique).not.toHaveBeenCalled();
  });
});

describe("reactToMessage", () => {
  it("rejects an emoji outside the fixed quick-reaction set", async () => {
    const result = await reactToMessage(MESSAGE_ID, "💩");
    expect(result.error).toBeDefined();
    expect(message.findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the message doesn't exist", async () => {
    message.findUnique.mockResolvedValue(null);

    const result = await reactToMessage(MESSAGE_ID, "❤️");

    expect(result.error).toBeDefined();
    expect(messageReaction.create).not.toHaveBeenCalled();
  });

  it("rejects when the caller isn't a participant of the message's conversation", async () => {
    message.findUnique.mockResolvedValue({
      conversationId: "conv-1",
      conversation: { participants: [{ userId: "someone-else" }] },
    });

    const result = await reactToMessage(MESSAGE_ID, "❤️");

    expect(result.error).toBeDefined();
    expect(messageReaction.create).not.toHaveBeenCalled();
  });

  it("adds a reaction when the caller is a participant and hasn't reacted with this emoji yet", async () => {
    message.findUnique.mockResolvedValue({
      conversationId: "conv-1",
      conversation: { participants: [{ userId: USER.id }] },
    });
    messageReaction.findUnique.mockResolvedValue(null);

    await reactToMessage(MESSAGE_ID, "❤️");

    expect(messageReaction.create).toHaveBeenCalledWith({
      data: { messageId: MESSAGE_ID, userId: USER.id, emoji: "❤️" },
    });
    expect(messageReaction.delete).not.toHaveBeenCalled();
  });

  it("toggles the reaction off when the caller already reacted with this emoji", async () => {
    message.findUnique.mockResolvedValue({
      conversationId: "conv-1",
      conversation: { participants: [{ userId: USER.id }] },
    });
    messageReaction.findUnique.mockResolvedValue({ id: "reaction-1" });

    await reactToMessage(MESSAGE_ID, "❤️");

    expect(messageReaction.delete).toHaveBeenCalledWith({ where: { id: "reaction-1" } });
    expect(messageReaction.create).not.toHaveBeenCalled();
  });
});

describe("setTyping", () => {
  it("scopes the write to the caller's own participant row", async () => {
    conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    await setTyping("conv-1");

    expect(conversationParticipant.updateMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1", userId: USER.id },
      data: { typingAt: expect.any(Date) },
    });
  });
});

describe("searchConversationMessages", () => {
  it("delegates to searchMessages with the authenticated userId, never a client-supplied one", async () => {
    searchMessages.mockResolvedValue([]);

    await searchConversationMessages("conv-1", "수학");

    expect(searchMessages).toHaveBeenCalledWith("conv-1", USER.id, "수학");
  });
});
