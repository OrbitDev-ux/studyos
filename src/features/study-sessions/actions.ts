"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const { data: active } = await supabase
    .from("StudySession")
    .select("id")
    .eq("userId", user.id)
    .is("endedAt", null)
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

  const { data: active } = await supabase
    .from("StudySession")
    .select("id, startedAt")
    .eq("userId", user.id)
    .is("endedAt", null)
    .maybeSingle();
  if (!active) return;

  const endedAt = new Date();
  const startedAt = new Date(active.startedAt);
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  );

  const { error } = await supabase
    .from("StudySession")
    .update({ endedAt: endedAt.toISOString(), durationSec })
    .eq("id", active.id);
  if (error) throw error;

  revalidatePath("/dashboard");
}
