import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * createBattle()'s two safety properties: (1) you can only invite accepted
 * friends — never an arbitrary userId, and (2) the Battle row + participants
 * land in ONE transaction, so a participant insert failure rolls the whole
 * thing back instead of leaving an orphaned, participant-less Battle row.
 * These assert the wiring against prisma mocks.
 */
const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const {
  friendship,
  battle,
  battleParticipant,
  transaction,
  tx,
} = vi.hoisted(() => {
  const tx = {
    battle: { create: vi.fn().mockResolvedValue({}) },
    battleParticipant: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  return {
    friendship: { findMany: vi.fn() },
    battle: { findUnique: vi.fn(), deleteMany: vi.fn() },
    battleParticipant: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn(),
    },
    transaction: vi.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    tx,
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { friendship, battle, battleParticipant, $transaction: transaction } }));

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

import { cancelBattle, createBattle, leaveBattle, respondToBattleInvite } from "@/features/battle/actions";

const USER = { id: "user-1", name: "학생", email: "student@example.com" };
const MUTUAL_FRIEND = { requesterId: "user-1", addresseeId: "friend-1" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  createNotifications.mockResolvedValue(undefined);
  createNotification.mockResolvedValue(undefined);
  markAsReadByTarget.mockResolvedValue(undefined);
  tx.battle.create.mockResolvedValue({});
  tx.battleParticipant.createMany.mockResolvedValue({ count: 1 });
});

describe("createBattle — friend-only invites", () => {
  it("refuses to invite a user who isn't an accepted friend", async () => {
    friendship.findMany.mockResolvedValue([]); // no friends

    await expect(
      createBattle({
        metric: "study_time",
        durationDays: "3",
        friendUserIds: ["not-a-friend"],
      }),
    ).rejects.toThrow("친구가 아닌 사용자는 초대할 수 없습니다.");
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("createBattle — rollback on partial failure", () => {
  it("rolls back the whole transaction (no orphaned Battle row) when a participant insert fails", async () => {
    friendship.findMany.mockResolvedValue([MUTUAL_FRIEND]);
    (tx.battleParticipant.createMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("insert failed"),
    );

    await expect(
      createBattle({
        metric: "study_time",
        durationDays: "3",
        friendUserIds: ["friend-1"],
      }),
    ).rejects.toThrow("insert failed");

    expect(battle.deleteMany).not.toHaveBeenCalled(); // rollback, no manual cleanup
    expect(createNotifications).not.toHaveBeenCalled();
  });
});

describe("createBattle — happy path", () => {
  it("creates the battle and notifies invited friends", async () => {
    friendship.findMany.mockResolvedValue([MUTUAL_FRIEND]);

    const battleId = await createBattle({
      metric: "study_time",
      durationDays: "3",
      friendUserIds: ["friend-1"],
    });

    expect(typeof battleId).toBe("string");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.battleParticipant.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: "user-1", status: "accepted" }),
        expect.objectContaining({ userId: "friend-1", status: "invited" }),
      ]),
    });
    expect(createNotifications).toHaveBeenCalledTimes(1);
    const notified = createNotifications.mock.calls[0]![0];
    expect(notified).toHaveLength(1);
    expect(notified[0].userId).toBe("friend-1");
  });
});

describe("respondToBattleInvite", () => {
  it("no-ops when there is no matching pending invite (already responded / not invited)", async () => {
    battleParticipant.findFirst.mockResolvedValue(null);

    await respondToBattleInvite("battle-1", true);

    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe("leaveBattle", () => {
  it("sets the caller's own accepted participant row to 'left'", async () => {
    battle.findUnique.mockResolvedValue({ creatorId: "someone-else" });
    battleParticipant.updateMany.mockResolvedValue({ count: 1 });

    await leaveBattle("battle-1");

    expect(battleParticipant.updateMany).toHaveBeenCalledWith({
      where: { battleId: "battle-1", userId: "user-1", status: "accepted" },
      data: { status: "left" },
    });
  });

  it("is a no-op for the battle's creator (use cancelBattle instead)", async () => {
    battle.findUnique.mockResolvedValue({ creatorId: "user-1" });

    await leaveBattle("battle-1");

    expect(battleParticipant.updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op when the battle doesn't exist", async () => {
    battle.findUnique.mockResolvedValue(null);

    await leaveBattle("battle-1");

    expect(battleParticipant.updateMany).not.toHaveBeenCalled();
  });
});

describe("cancelBattle", () => {
  it("scopes the delete to (id, creatorId) so a non-creator can't cancel someone else's battle", async () => {
    battle.deleteMany.mockResolvedValue({ count: 1 });

    await cancelBattle("battle-1");

    expect(battle.deleteMany).toHaveBeenCalledWith({
      where: { id: "battle-1", creatorId: "user-1" },
    });
  });
});