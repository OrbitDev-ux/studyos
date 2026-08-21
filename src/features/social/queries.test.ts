import { describe, expect, it, vi } from "vitest";
import { getBlockedUsers, getReceivedFriendRequests } from "@/features/social/queries";

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
const { friendship, blockedUser } = vi.hoisted(() => ({
  friendship: { findMany: vi.fn() },
  blockedUser: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { friendship, blockedUser } }));

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
