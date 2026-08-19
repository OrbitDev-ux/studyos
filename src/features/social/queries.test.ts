import { describe, expect, it, vi } from "vitest";
import { getReceivedFriendRequests } from "@/features/social/queries";

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
const { friendship } = vi.hoisted(() => ({
  friendship: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { friendship } }));

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
