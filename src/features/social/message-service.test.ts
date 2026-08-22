import { beforeEach, describe, expect, it, vi } from "vitest";

const { conversationParticipant, message, conversation, transaction } = vi.hoisted(() => ({
  conversationParticipant: { findUnique: vi.fn() },
  message: { count: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  conversation: { update: vi.fn().mockResolvedValue({}) },
  transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { conversationParticipant, message, conversation, $transaction: transaction },
}));

const { createNotification } = vi.hoisted(() => ({ createNotification: vi.fn() }));
vi.mock("@/features/notifications/service", () => ({ createNotification }));

import { createConversationMessage } from "@/features/social/message-service";

const SENDER = { id: "user-1", name: "학생", email: "student@example.com" };
const CONVERSATION_ID = "conv-1";

beforeEach(() => {
  vi.clearAllMocks();
  conversationParticipant.findUnique.mockResolvedValue({
    conversation: { participants: [{ userId: SENDER.id }, { userId: "user-2" }] },
  });
  message.count.mockResolvedValue(0);
  message.create.mockResolvedValue({ id: "msg-new" });
  message.findFirst.mockResolvedValue(null);
});

describe("createConversationMessage — plain text", () => {
  it("is a no-op for blank content with no shared attachment", async () => {
    await createConversationMessage(SENDER, CONVERSATION_ID, { content: "   " });
    expect(message.create).not.toHaveBeenCalled();
  });

  it("throws when the sender isn't a participant", async () => {
    conversationParticipant.findUnique.mockResolvedValue(null);
    await expect(
      createConversationMessage(SENDER, CONVERSATION_ID, { content: "hi" }),
    ).rejects.toThrow("대화에 참여하고 있지 않습니다.");
  });

  it("throws past the rate limit", async () => {
    message.count.mockResolvedValue(15);
    await expect(
      createConversationMessage(SENDER, CONVERSATION_ID, { content: "hi" }),
    ).rejects.toThrow("너무 빠르게");
  });
});

describe("createConversationMessage — shared content", () => {
  it("creates a message even with empty content, as long as a share is attached", async () => {
    await createConversationMessage(SENDER, CONVERSATION_ID, {
      content: "",
      sharedType: "PROBLEM",
      sharedId: "problem-1",
    });

    expect(message.create).toHaveBeenCalledWith({
      data: {
        conversationId: CONVERSATION_ID,
        senderId: SENDER.id,
        content: "",
        replyToId: null,
        sharedType: "PROBLEM",
        sharedId: "problem-1",
      },
    });
  });

  it("uses the custom notification preview when provided, not the raw (possibly empty) content", async () => {
    await createConversationMessage(SENDER, CONVERSATION_ID, {
      content: "",
      sharedType: "PROBLEM",
      sharedId: "problem-1",
      notificationPreview: () => "📚 문제를 공유했어요",
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ body: "📚 문제를 공유했어요" }),
    );
  });
});
