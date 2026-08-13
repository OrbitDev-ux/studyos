"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/admin/context";
import { getLabFeature } from "@/features/lab/registry";
import { setLabFeatureEnabled } from "@/features/lab/state";

/** Admin ON/OFF for an experiment. Server-authorized (manageLab capability). */
export async function toggleLabFeature(
  key: string,
  enabled: boolean,
): Promise<{ ok?: true; error?: string }> {
  await requireCapability("manageLab");
  if (!getLabFeature(key)) return { error: "존재하지 않는 실험 기능입니다." };
  await setLabFeatureEnabled(key, enabled);
  revalidatePath("/admin/lab");
  revalidatePath("/lab");
  return { ok: true };
}
