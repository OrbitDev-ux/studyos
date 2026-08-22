import { describe, expect, it, vi } from "vitest";
import {
  getBlockedUsers,
  getConversation,
  getConversations,
  getReceivedFriendRequests,
  searchMessages,
} from "@/features/social/queries";

/**
 * Security regression test: getReceivedFriendRequests() is passed directly
 * as a prop into a "use client" component (FriendRequestList), so its result
 * is fully serialized to the browser regardless of which fields that
 * component's JSX reads. An `include: { requester: true }` (no select)
 * previously shipped the requester's bcrypt password hash — and email,
 * banReason, etc. — to whoever received their friend request. This asserts
 * the query only ever selects the fields FriendRequestList actually renders
 * (id/name/image/email), so a future edit can't silently widen it back to a
 * full-row `include` without this test failing.
 */
const { friendship, blockedUser, conversation, conversationParticipant, message, problem } =
  vi.hoisted(() => ({
    friendship: { findMany: vi.fn() },
    blockedUser: { findMany: vi.fn() },
    conversation: { findMany: vi.fn(), findFirst: vi.fn() },
    conversationParticipant: { findUnique: vi.fn() },
    message: { count: vi.fn(), findMany: vi.fn() },
    problem: { findMany: vi.fn() },
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: { friendship, blockedUser, conversation, conversationParticipant, message, problem },
}));

describe("getReceivedFriendRequests", () => {
  it("selects only safe requester fields — never a bare `true` include", async () => {
    friendship.findMany.mockResolvedValue([]);
    await getReceivedFriendRequests("user-1");

    expect(friendship.findMany).toHaveBeenCalledTimes(1);
    const call = friendship.findMany.mock.calls[0]![0];
    expect(call.where).toEqual({ addresseeId: "user-1", status: "pending" });

    const requesterClause = call.include.requester;
    expect(requesterClause).not.toBe(true);
    expect(requesterClause.select).toEqual({
      id: true,
      name: true,
      image: true,
      email: true,
    });
    // The whole point: password must never be selectable here.
    expect(requesterClause.select.password).toBeUndefined();
  });
});

describe("getBlockedUsers", () => {
  it("selects only safe blocked-user fields — never a bare `true` include (same rationale as getReceivedFriendRequests)", async () => {
    blockedUser.findMany.mockResolvedValue([]);
    await getBlockedUsers("user-1");

    expect(blockedUser.findMany).toHaveBeenCalledTimes(1);
    const call = blockedUser.findMany.mock.calls[0]![0];
    expect(call.where).toEqual({ blockerId: "user-1" });

    const blockedClause = call.include.blocked;
    expect(blockedClause).not.toBe(true);
    expect(blockedClause.select).toEqual({
      id: true,
      name: true,
      image: true,
      email: true,
    });
    expect(blockedClause.select.password).toBeUndefined();
  });
});

describe("getConversations / getConversation — participant.user field narrowing", () => {
  it("getConversations selects only safe participant.user fields (Security audit: was a bare `include: { user: true }`)", async () => {
    conversation.findMany.mockResolvedValue([]);

    await getConversations("user-1");

    const call = conversation.findMany.mock.calls[0]![0];
    const userClause = call.include.participants.include.user;
    expect(userClause).not.toBe(true);
    expect(userClause.select).toEqual({
      id: true,
      name: true,
      image: true,
      email: true,
      lastSeenAt: true,
    });
    expect(userClause.select.password).toBeUndefined();
  });

  it("getConversation selects only safe participant.user fields too", async () => {
    conversation.findFirst.mockResolvedValue(null);

    await getConversation("conv-1", "user-1");

    const call = conversation.findFirst.mock.calls[0]![0];
    const userClause = call.include.participants.include.user;
    expect(userClause).not.toBe(true);
    expect(userClause.select).toEqual({
      id: true,
      name: true,
      image: true,
      email: true,
      lastSeenAt: true,
    });
    expect(userClause.select.password).toBeUndefined();
  });

  it("getConversation redacts a soft-deleted message's content even if the DB row somehow still has it", async () => {
    conversation.findFirst.mockResolvedValue({
      id: "conv-1",
      participants: [],
      messages: [
        {
          id: "m1",
          content: "should never surface",
          deletedAt: new Date(),
          replyTo: null,
        },
      ],
    });

    const result = await getConversation("conv-1", "user-1");

    expect(result!.messages[0]!.content).toBe("");
  });

  it("marks a shared problem as solvable only when the viewer owns it or it's from the shared bank", async () => {
    conversation.findFirst.mockResolvedValue({
      id: "conv-1",
      participants: [],
      messages: [
        { id: "m1", content: "", deletedAt: null, replyTo: null, sharedType: "PROBLEM", sharedId: "p-mine" },
        { id: "m2", content: "", deletedAt: null, replyTo: null, sharedType: "PROBLEM", sharedId: "p-bank" },
        { id: "m3", content: "", deletedAt: null, replyTo: null, sharedType: "PROBLEM", sharedId: "p-someone-elses" },
      ],
    });
    problem.findMany.mockResolvedValue([
      { id: "p-mine", prompt: "1", type: "MULTIPLE_CHOICE", difficulty: "EASY", userId: "user-1", source: null, subject: null },
      { id: "p-bank", prompt: "2", type: "MULTIPLE_CHOICE", difficulty: "EASY", userId: "someone-else", source: "import", subject: null },
      { id: "p-someone-elses", prompt: "3", type: "MULTIPLE_CHOICE", difficulty: "EASY", userId: "someone-else", source: null, subject: null },
    ]);

    const result = await getConversation("conv-1", "user-1");

    expect(result!.messages[0]!.sharedProblem?.canSolve).toBe(true); // own problem
    expect(result!.messages[1]!.sharedProblem?.canSolve).toBe(true); // shared bank
    expect(result!.messages[2]!.sharedProblem?.canSolve).toBe(false); // someone else's private problem
    // Raw ownership/source must never leak onto the client-facing shape.
    expect(result!.messages[0]!.sharedProblem).not.toHaveProperty("userId");
    expect(result!.messages[0]!.sharedProblem).not.toHaveProperty("source");
  });
});

describe("searchMessages", () => {
  it("returns an empty result for a blank query without touching the database", async () => {
    const result = await searchMessages("conv-1", "user-1", "   ");
    expect(result).toEqual([]);
    expect(conversationParticipant.findUnique).not.toHaveBeenCalled();
  });

  it("returns an empty result when the caller isn't a participant — never runs the content search", async () => {
    conversationParticipant.findUnique.mockResolvedValue(null);

    const result = await searchMessages("conv-1", "user-1", "수학");

    expect(result).toEqual([]);
    expect(message.findMany).not.toHaveBeenCalled();
  });

  it("scopes the search to the conversation and excludes deleted messages", async () => {
    conversationParticipant.findUnique.mockResolvedValue({ id: "p1" });
    message.findMany.mockResolvedValue([]);

    await searchMessages("conv-1", "user-1", "수학");

    expect(message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId: "conv-1",
          deletedAt: null,
          content: { contains: "수학", mode: "insensitive" },
        },
      }),
    );
  });
});
