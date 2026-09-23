import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Security regression: getBattles/getBattle embed participants only with a
 * narrowed user select — never the full row, which would include the bcrypt
 * password hash. This is exactly the shape that DID leak once before in this
 * codebase (see social/queries.ts's getReceivedFriendRequests doc comment) —
 * this asserts the Prisma include stays narrowed so a future edit can't widen
 * it back to a full `user: true` include without this test failing.
 */
const { prisma } = vi.hoisted(() => ({
  prisma: {
    battleParticipant: { findMany: vi.fn(), findFirst: vi.fn() },
    battle: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { getBattle, getBattles } from "@/features/battle/queries";

const PART_USER_SELECT = { id: true, name: true, email: true, image: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("battle participant user select", () => {
  it("getBattles never includes the full User row for participants", async () => {
    prisma.battleParticipant.findMany.mockResolvedValue([{ battleId: "battle-1" }]);
    prisma.battle.findMany.mockResolvedValue([]);

    await getBattles("user-1");

    const include = prisma.battle.findMany.mock.calls[0]![0].include;
    const participantUserSelect = include.participants.include.user.select;
    expect(participantUserSelect).toEqual(PART_USER_SELECT);
    expect(participantUserSelect).not.toHaveProperty("password");
    expect(include.participants.include.user).not.toEqual(true);
  });

  it("getBattle never includes the full User row for participants", async () => {
    prisma.battleParticipant.findFirst.mockResolvedValue({ id: "participation-1" });
    prisma.battle.findUnique.mockResolvedValue(null);

    await getBattle("battle-1", "user-1");

    const include = prisma.battle.findUnique.mock.calls[0]![0].include;
    const participantUserSelect = include.participants.include.user.select;
    expect(participantUserSelect).toEqual(PART_USER_SELECT);
    expect(participantUserSelect).not.toHaveProperty("password");
    expect(include.participants.include.user).not.toEqual(true);
  });
});