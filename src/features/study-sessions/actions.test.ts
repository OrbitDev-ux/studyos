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

const { onStudySessionCompleted } = vi.hoisted(() => ({
  onStudySessionCompleted: vi.fn(),
}));
vi.mock("@/features/growth/hooks", () => ({ onStudySessionCompleted }));

const { prisma } = vi.hoisted(() => ({ prisma: { studySession: {} } }));
vi.mock("@/lib/prisma", () => ({ prisma }));

/** A minimal stand-in for the Prisma studySession model: `findFirst` and
 * `updateMany` resolve (via `await`) to whatever the test queued up next via
 * `queueResult`. */
function makePrismaModelStub() {
  const results: unknown[] = [];
  Object.assign(prisma.studySession, {
    findFirst: vi.fn(() => Promise.resolve(results.shift() ?? null)),
    updateMany: vi.fn(() => Promise.resolve(results.shift() ?? { count: 0 })),
  });
  return {
    queueResult: (result: unknown) => results.push(result),
  };
}

import { stopStudySession } from "@/features/study-sessions/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };
const SESSION_ID = "session-1";
const STARTED_AT = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 min ago

let queueResult: (result: unknown) => void;

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  queueResult = makePrismaModelStub().queueResult;
});

describe("stopStudySession — Growth integration", () => {
  it("passes the server-verified (reward-eligible) duration to onStudySessionCompleted when it closes the session", async () => {
    // Session was heartbeat-verified for its whole 45 minutes: accumulated
    // rewardEligibleDurationSec is 45min already, and lastVerifiedAt is fresh,
    // so the final close credits the contiguous tail too.
    queueResult({
      id: SESSION_ID,
      startedAt: new Date(STARTED_AT),
      lastVerifiedAt: new Date(),
      rewardEligibleDurationSec: 45 * 60,
    }); // active lookup
    queueResult({ count: 1 }); // updateMany() actually closed the session

    await stopStudySession();

    expect(onStudySessionCompleted).toHaveBeenCalledTimes(1);
    const [userId, sessionId, durationSec, timezone] =
      onStudySessionCompleted.mock.calls[0]!;
    expect(userId).toBe("user-1");
    expect(sessionId).toBe(SESSION_ID);
    expect(timezone).toBe("Asia/Seoul");
    expect(durationSec).toBeGreaterThanOrEqual(44 * 60);
    expect(durationSec).toBeLessThanOrEqual(46 * 60);
  });

  it("credits NOTHING to onStudySessionCompleted when the session was never heartbeat-verified (anti-cheat)", async () => {
    // A 45-minute session with no presence checkpoint is the exact
    // "started the timer and left" case — finalizeEligibleDuration returns 0,
    // so the Growth hook is called with 0 reward-eligible seconds.
    queueResult({
      id: SESSION_ID,
      startedAt: new Date(STARTED_AT),
      lastVerifiedAt: null,
      rewardEligibleDurationSec: 0,
    }); // active lookup
    queueResult({ count: 1 }); // updateMany() actually closed the session

    await stopStudySession();

    expect(onStudySessionCompleted).toHaveBeenCalledTimes(1);
    expect(onStudySessionCompleted.mock.calls[0]![2]).toBe(0);
  });

  it("does NOT call onStudySessionCompleted when there is no active session", async () => {
    queueResult(null); // no active session

    await stopStudySession();

    expect(onStudySessionCompleted).not.toHaveBeenCalled();
  });

  it("does NOT call onStudySessionCompleted when this call lost the race to close the session", async () => {
    queueResult({ id: SESSION_ID, startedAt: new Date(STARTED_AT) }); // active lookup
    // A concurrent call already closed it: .where endedAt: null now matches
    // nothing, so the guarded updateMany returns count 0.
    queueResult({ count: 0 });

    await stopStudySession();

    expect(onStudySessionCompleted).not.toHaveBeenCalled();
  });
});
