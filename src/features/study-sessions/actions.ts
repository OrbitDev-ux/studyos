"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { onStudySessionCompleted } from "@/features/growth/hooks";
import { finalizeEligibleDuration } from "@/features/study-sessions/eligibility";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { capture } from "@/features/analytics/capture";

const STUDY_SESSION_TYPES = ["FOCUS", "PROBLEM", "MOCK_EXAM", "REVIEW", "AI_TUTOR"] as const;
export type StudySessionType = (typeof STUDY_SESSION_TYPES)[number];

export async function startStudySession(arg?: FormData | StudySessionType) {
  const user = await requireCurrentUser();

  // Callable two ways: as a <form action> (arg is FormData → default FOCUS) or
  // programmatically with an explicit type. Whitelist server-side so a client
  // can never persist an arbitrary value into the shared study-session log.
  const sessionType: StudySessionType =
    typeof arg === "string" && (STUDY_SESSION_TYPES as readonly string[]).includes(arg)
      ? (arg as StudySessionType)
      : "FOCUS";

  // findFirst (not findUnique on the open-session predicate): if a past race
  // ever left more than one open session for this user, findFirst just picks
  // the newest instead of throwing on "more than one row" — same resilience
  // the old Supabase limit(1)/maybeSingle() pair gave us.
  const active = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (active) return;

  await prisma.studySession.create({
    data: { id: randomUUID(), userId: user.id, startedAt: new Date(), type: sessionType },
  });

  revalidatePath("/dashboard");
}

export async function stopStudySession() {
  const user = await requireCurrentUser();

  // Same resilience as startStudySession: if more than one open session ever
  // exists for this user, close the most recently started one instead of a
  // findUnique-throwing race leaving the timer stuck open forever.
  const active = await prisma.studySession.findFirst({
    where: { userId: user.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      lastVerifiedAt: true,
      rewardEligibleDurationSec: true,
    },
  });
  if (!active) return;

  const endedAt = new Date();
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - active.startedAt.getTime()) / 1000),
  );

  // Anti-cheat: durationSec (wall-clock) keeps being the personal record, but
  // only the server-verified portion — proximity to the app-wide presence
  // heartbeat — may drive XP/missions (passed to the Growth hook below) and the
  // competitive surfaces (streak/ranking/battle/friend feed). A session that
  // sat open unattended earns nothing no matter how long it ran.
  const rewardEligibleDurationSec = finalizeEligibleDuration(active, endedAt);

  // .where endedAt: null guards against a double-submit (e.g. a doubled form
  // action call) racing this same update twice — the second call's UPDATE
  // then matches zero rows instead of re-closing (and re-durationing) the
  // same session a second time. updateMany's count tells us WHICH call
  // actually performed the close (count 1) vs lost the race (count 0) —
  // needed below so the Growth hook only ever fires once per session, from
  // whichever call actually closed it.
  const closed = await prisma.studySession.updateMany({
    where: { id: active.id, endedAt: null },
    data: { endedAt, durationSec, rewardEligibleDurationSec, lastVerifiedAt: endedAt },
  });

  revalidatePath("/dashboard");

  if (closed.count > 0) {
    capture({ name: "study_session_completed", props: { durationSec } });
    // Growth/Mission progress — server-measured, reward-eligible duration
    // only, keyed by this session's own id so it can never be credited twice
    // (features/growth/hooks.ts).
    await onStudySessionCompleted(user.id, active.id, rewardEligibleDurationSec, user.timezone);
  }
}
