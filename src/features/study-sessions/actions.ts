"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";

export async function startStudySession() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

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
