import { describe, expect, it, vi } from "vitest";

/**
 * Security regression: getBattles/getBattle used to embed participants via
 * `user:User(*)` — the full row, including the bcrypt password hash — into
 * server memory on every battle read. Confirmed no LIVE leak (both consuming
 * pages are server components that never spread the raw object into a "use
 * client" prop), but this is exactly the shape that DID leak once before in
 * this codebase (see social/queries.ts's getReceivedFriendRequests doc
 * comment) — this asserts the select stays narrowed so a future edit can't
 * widen it back to `User(*)` without this test failing.
 *
 * The Supabase query builder is a thenable, chainable object — this stub
 * makes every chain method return itself and resolves whatever the chain
 * eventually awaits to a canned { data, error } based on the table name.
 */
function makeChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.order = vi.fn(self);
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolveValue));
  chain.then = (
    onFulfilled: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => Promise.resolve(resolveValue).then(onFulfilled, onRejected);
  return chain;
}

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));

function selectCallsFor(table: string) {
  const chain = fromMock.mock.results.find(
    (r, i) => fromMock.mock.calls[i]?.[0] === table,
  )?.value as { select: ReturnType<typeof vi.fn> } | undefined;
  return chain?.select.mock.calls ?? [];
}

import { getBattle, getBattles } from "@/features/battle/queries";

describe("battle participant user select", () => {
  it("getBattles never selects the full User row for participants", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "BattleParticipant"
        ? makeChain({ data: [{ battleId: "battle-1" }], error: null })
        : makeChain({ data: [], error: null }),
    );

    await getBattles("user-1");

    const battleSelects = selectCallsFor("Battle").map((c) => String(c[0]));
    const participantsSelect = battleSelects.find((s) => s.includes("participants"));
    expect(participantsSelect).toBeDefined();
    expect(participantsSelect).not.toMatch(/user:User\(\*\)/);
    expect(participantsSelect).toMatch(/user:User\(id,name,email,image\)/);
  });

  it("getBattle never selects the full User row for participants", async () => {
    fromMock.mockImplementation((table: string) =>
      table === "BattleParticipant"
        ? makeChain({ data: { id: "participation-1" }, error: null })
        : makeChain({ data: null, error: null }),
    );

    await getBattle("battle-1", "user-1");

    const battleSelects = selectCallsFor("Battle").map((c) => String(c[0]));
    const participantsSelect = battleSelects.find((s) => s.includes("participants"));
    expect(participantsSelect).toBeDefined();
    expect(participantsSelect).not.toMatch(/user:User\(\*\)/);
    expect(participantsSelect).toMatch(/user:User\(id,name,email,image\)/);
  });
});
