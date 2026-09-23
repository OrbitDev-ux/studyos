import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Reward-eligibility policy for StudySession (anti-cheat hardening).
 *
 * durationSec is raw wall-clock time — recorded for personal tracking, but it
 * alone must never drive rewarded/competitive surfaces (XP, streak, ranking,
 * battle study-time, missions, friend feed), because a session that is started
 * and never attended (timer left open) inflates it with zero real activity.
 *
 * This module decides how much of a session's time is actually credited to
 * those surfaces, using a single non-invasive signal that already exists: the
 * app-wide presence heartbeat (ClientComponent presence-heartbeat.tsx ->
 * touchPresence), which pings every HEARTBEAT_INTERVAL_MS while any tab is
 * visible. No new per-user endpoint or event log is introduced — we only stamp
 * a checkpoint on the active session row when that existing heartbeat fires.
 */

/** Longest wall-clock span without a presence proof that is still credited.
 * Longer gaps (tab hidden/closed, user away) are never credited. */
export const MAX_VERIFIED_GAP_SEC = 600;

export type ActiveSessionProof = {
  startedAt: Date;
  lastVerifiedAt: Date | null;
  rewardEligibleDurationSec: number;
};

/**
 * Pure policy: how much of a closing session's time is eligible for reward /
 * competition given the checkpoints recorded so far.
 *
 * - lastVerifiedAt present: accumulated eligible time plus the final span back
 *   to `endedAt` IF that final span is within MAX_VERIFIED_GAP_SEC (i.e. the
 *   user was present at close, not just at the last heartbeat).
 * - No heartbeat at all during the session: credit the raw duration only for
 *   sessions short enough to be genuinely real (a quick timed study block
 *   finishes before the first heartbeat fires). A long session with zero proof
 *   gets nothing — that is exactly the "started the timer and left" case.
 */
export function finalizeEligibleDuration(
  active: ActiveSessionProof,
  endedAt: Date,
): number {
  const rawSec = Math.max(
    0,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000),
  );

  if (active.lastVerifiedAt == null) {
    return rawSec <= MAX_VERIFIED_GAP_SEC ? rawSec : 0;
  }

  const tailSec = Math.max(
    0,
    Math.floor((endedAt.getTime() - active.lastVerifiedAt.getTime()) / 1000),
  );
  const tail = tailSec <= MAX_VERIFIED_GAP_SEC ? tailSec : 0;
  return active.rewardEligibleDurationSec + tail;
}

/**
 * Server-stamped presence checkpoint on the user's active study session.
 * Called from the existing app-wide heartbeat (touchPresence) — NOT from any
 * new client call. If a session is open, the wall-clock span since the last
 * checkpoint is credited when it is within MAX_VERIFIED_GAP_SEC; a longer gap
 * is never credited and merely moves the checkpoint forward.
 *
 * Guards: `endedAt: null` in the update means a concurrent stopStudySession
 * that closed the session in the meantime leaves it untouched, and the
 * checkpoint can never bleed into a session that is no longer active.
 */
export async function stampActiveSessionCheckpoint(
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const active = await prisma.studySession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      lastVerifiedAt: true,
      rewardEligibleDurationSec: true,
    },
  });
  if (!active) return;

  const base = active.lastVerifiedAt ?? active.startedAt;
  const gapSec = Math.floor((now.getTime() - base.getTime()) / 1000);
  if (gapSec <= 0) return;

  // Optimistic concurrency: a single wall-clock interval must be credited at
  // most ONCE, even when two heartbeats overlap (e.g. several open tabs all
  // pinging touchPresence). Both would read the same `base` and both would
  // INCREMENT by the same gap without a guard — a multi-tab user (or a replay)
  // could otherwise farm the window repeatedly. Filtering on
  // `lastVerifiedAt: base` makes the FIRST stamp to arrive win the interval;
  // the second matches zero rows and increments nothing. `base` is either the
  // stored checkpoint or (legacy open sessions, see the reward-eligibility
  // migration) `startedAt` — both are server-stamped values, never client input.
  // On the "gap too long, move checkpoint only" path the same guard prevents
  // two overlapping stamps from advancing the checkpoint twice for one stale
  // interval.
  const data =
    gapSec <= MAX_VERIFIED_GAP_SEC
      ? {
          rewardEligibleDurationSec: { increment: gapSec } as const,
          lastVerifiedAt: now,
        }
      : { lastVerifiedAt: now };

  await prisma.studySession.updateMany({
    where: { id: active.id, endedAt: null, lastVerifiedAt: base },
    data,
  });
}
