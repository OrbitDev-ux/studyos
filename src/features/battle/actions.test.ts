import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * createBattle()'s two safety properties had no coverage: (1) you can only
 * invite accepted friends — never an arbitrary userId, and (2) if the
 * participant insert fails after the Battle row is already created, the
 * Battle row is rolled back rather than left as an orphaned, participant-less
 * row. Uses a small per-table fake to stand in for the chained Supabase
 * query builder (`.from(table).select()/.insert()/.eq()/.or()/...`).
 */
const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from })) }));

const { createNotification, createNotifications, markAsReadByTarget } = vi.hoisted(
  () => ({
    createNotification: vi.fn(),
    createNotifications: vi.fn(),
    markAsReadByTarget: vi.fn(),
  }),
);
vi.mock("@/features/notifications/service", () => ({
  createNotification,
  createNotifications,
  markAsReadByTarget,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createBattle, respondToBattleInvite } from "@/features/battle/actions";

const USER = { id: "user-1", name: "학생", email: "student@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  createNotifications.mockResolvedValue(undefined);
  createNotification.mockResolvedValue(undefined);
  markAsReadByTarget.mockResolvedValue(undefined);
});

describe("createBattle — friend-only invites", () => {
  it("refuses to invite a user who isn't an accepted friend", async () => {
    from.mockImplementation((table: string) => {
      if (table === "Friendship") {
        return {
          select: () => ({
            eq: () => ({
              or: () => Promise.resolve({ data: [], error: null }), // no friends
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(
      createBattle({
        metric: "study_time",
        durationDays: "3",
        friendUserIds: ["not-a-friend"],
      }),
    ).rejects.toThrow("친구가 아닌 사용자는 초대할 수 없습니다.");
  });
});

describe("createBattle — rollback on partial failure", () => {
  it("deletes the just-created Battle row if the participants insert fails", async () => {
    const battleDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({}) }));
    from.mockImplementation((table: string) => {
      if (table === "Friendship") {
        return {
          select: () => ({
            eq: () => ({
              or: () =>
                Promise.resolve({
                  data: [{ requesterId: "user-1", addresseeId: "friend-1" }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "Battle") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: battleDelete,
        };
      }
      if (table === "BattleParticipant") {
        return {
          insert: vi.fn().mockResolvedValue({ error: { message: "insert failed" } }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(
      createBattle({
        metric: "study_time",
        durationDays: "3",
        friendUserIds: ["friend-1"],
      }),
    ).rejects.toEqual({ message: "insert failed" });

    expect(battleDelete).toHaveBeenCalledTimes(1);
    expect(createNotifications).not.toHaveBeenCalled();
  });
});

describe("createBattle — happy path", () => {
  it("creates the battle and notifies invited friends", async () => {
    from.mockImplementation((table: string) => {
      if (table === "Friendship") {
        return {
          select: () => ({
            eq: () => ({
              or: () =>
                Promise.resolve({
                  data: [{ requesterId: "user-1", addresseeId: "friend-1" }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "Battle") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "BattleParticipant") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const battleId = await createBattle({
      metric: "study_time",
      durationDays: "3",
      friendUserIds: ["friend-1"],
    });

    expect(typeof battleId).toBe("string");
    expect(createNotifications).toHaveBeenCalledTimes(1);
    const notified = createNotifications.mock.calls[0]![0];
    expect(notified).toHaveLength(1);
    expect(notified[0].userId).toBe("friend-1");
  });
});

describe("respondToBattleInvite", () => {
  it("no-ops when there is no matching pending invite (already responded / not invited)", async () => {
    from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }),
          }),
        }),
      }),
    }));

    await respondToBattleInvite("battle-1", true);

    expect(createNotification).not.toHaveBeenCalled();
  });
});
