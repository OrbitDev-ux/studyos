import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * stopStudySession had zero test coverage before this. Covers the new
 * Growth/Mission integration point specifically: the hook must fire exactly
 * once per session, only from whichever call actually closed it (never from
 * a call that lost the "who gets to close this session" race).
 */
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { onStudySessionCompleted } = vi.hoisted(() => ({ onStudySessionCompleted: vi.fn() }));
vi.mock("@/features/growth/hooks", () => ({ onStudySessionCompleted }));

/** A minimal stand-in for the Supabase query builder: every chain method
 * returns itself, and it resolves (via `await`) to whatever the test queued
 * up next via `queueResult`. */
function makeSupabaseStub() {
  const results: { data: unknown; error: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const method of ["from", "select", "eq", "is", "order", "limit", "update"]) {
    chain[method] = vi.fn(self);
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(results.shift() ?? { data: null, error: null }));
  return {
    client: chain,
    queueResult: (result: { data: unknown; error: unknown }) => results.push(result),
  };
}

const { createClient, supa } = vi.hoisted(() => {
  const stub = { client: null as unknown, queueResult: null as unknown };
  return { createClient: vi.fn(async () => stub.client), supa: stub };
});
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { stopStudySession } from "@/features/study-sessions/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };
const SESSION_ID = "session-1";
const STARTED_AT = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 min ago

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  const stub = makeSupabaseStub();
  Object.assign(supa, stub);
});

describe("stopStudySession — Growth integration", () => {
  it("calls onStudySessionCompleted with the real elapsed duration when it actually closes the session", async () => {
    const { queueResult } = supa as unknown as ReturnType<typeof makeSupabaseStub>;
    queueResult({ data: { id: SESSION_ID, startedAt: STARTED_AT }, error: null }); // active lookup
    queueResult({ data: { id: SESSION_ID }, error: null }); // update ... .select().maybeSingle() succeeded

    await stopStudySession();

    expect(onStudySessionCompleted).toHaveBeenCalledTimes(1);
    const [userId, sessionId, durationSec, timezone] = onStudySessionCompleted.mock.calls[0]!;
    expect(userId).toBe("user-1");
    expect(sessionId).toBe(SESSION_ID);
    expect(timezone).toBe("Asia/Seoul");
    expect(durationSec).toBeGreaterThanOrEqual(44 * 60);
    expect(durationSec).toBeLessThanOrEqual(46 * 60);
  });

  it("does NOT call onStudySessionCompleted when there is no active session", async () => {
    const { queueResult } = supa as unknown as ReturnType<typeof makeSupabaseStub>;
    queueResult({ data: null, error: null }); // no active session

    await stopStudySession();

    expect(onStudySessionCompleted).not.toHaveBeenCalled();
  });

  it("does NOT call onStudySessionCompleted when this call lost the race to close the session", async () => {
    const { queueResult } = supa as unknown as ReturnType<typeof makeSupabaseStub>;
    queueResult({ data: { id: SESSION_ID, startedAt: STARTED_AT }, error: null }); // active lookup
    // A concurrent call already closed it: .eq("endedAt", null) now matches
    // nothing, so the guarded update's .select().maybeSingle() returns null.
    queueResult({ data: null, error: null });

    await stopStudySession();

    expect(onStudySessionCompleted).not.toHaveBeenCalled();
  });
});
