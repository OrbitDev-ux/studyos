"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onStudySessionCompleted } from "@/features/growth/hooks";
import { requireCurrentUser } from "@/lib/session";

const STUDY_SESSION_TYPES = ["FOCUS", "PROBLEM", "MOCK_EXAM", "REVIEW", "AI_TUTOR"] as const;
export type StudySessionType = (typeof STUDY_SESSION_TYPES)[number];

export async function startStudySession(arg?: FormData | StudySessionType) {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  // Callable two ways: as a <form action> (arg is FormData → default FOCUS) or
  // programmatically with an explicit type. Whitelist server-side so a client
  // can never persist an arbitrary value into the shared study-session log.
  const sessionType: StudySessionType =
    typeof arg === "string" && (STUDY_SESSION_TYPES as readonly string[]).includes(arg)
      ? (arg as StudySessionType)
      : "FOCUS";

  // .limit(1) + order (not a bare .maybeSingle() on the raw filter): if a past
  // race ever left more than one open session for this user, .maybeSingle()
  // would throw on "more than one row" instead of just detecting "one is
  // open" — this stays resilient to that instead of hard-failing the whole
  // start action.
  const { data: active } = await supabase
    .from("StudySession")
    .select("id")
    .eq("userId", user.id)
    .is("endedAt", null)
    .order("startedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return;

  const { error } = await supabase.from("StudySession").insert({
    id: randomUUID(),
    userId: user.id,
    startedAt: new Date().toISOString(),
    type: sessionType,
  });
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function stopStudySession() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  // Same resilience as startStudySession: if more than one open session ever
  // exists for this user, close the most recently started one instead of
  // .maybeSingle() throwing on "more than one row" and leaving the timer
  // stuck open forever.
  const { data: active } = await supabase
    .from("StudySession")
    .select("id, startedAt")
    .eq("userId", user.id)
    .is("endedAt", null)
    .order("startedAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!active) return;

  const endedAt = new Date();
  const startedAt = new Date(active.startedAt);
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  );

  // .eq("endedAt", null) guards against a double-submit (e.g. a doubled form
  // action call) racing this same update twice — the second call's UPDATE
  // then matches zero rows instead of re-closing (and re-durationing) the
  // same session a second time. .select().maybeSingle() lets us tell WHICH
  // call actually performed the close (a row comes back) vs lost the race
  // (null) — needed below so the Growth hook only ever fires once per
  // session, from whichever call actually closed it.
  const { data: closed, error } = await supabase
    .from("StudySession")
    .update({ endedAt: endedAt.toISOString(), durationSec })
    .eq("id", active.id)
    .is("endedAt", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;

  revalidatePath("/dashboard");

  if (closed) {
    // Growth/Mission progress — server-measured duration only, keyed by this
    // session's own id so it can never be credited twice (features/growth/hooks.ts).
    await onStudySessionCompleted(user.id, active.id, durationSec, user.timezone);
  }
}
