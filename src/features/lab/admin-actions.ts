"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/admin/context";
import { getLabFeature } from "@/features/lab/registry";
import { setLabFeatureEnabled } from "@/features/lab/state";

/** Admin ON/OFF for an experiment. Server-authorized (manageLab capability). */
export async function toggleLabFeature(
  key: string,
  enabled: boolean,
): Promise<{ ok?: true; error?: string }> {
  // requireCapability() may redirect() (NEXT_REDIRECT control-flow) — stays
  // outside the try below so that's never swallowed as a generic failure.
  await requireCapability("manageLab");
  if (!getLabFeature(key)) return { error: "존재하지 않는 실험 기능입니다." };

  try {
    await setLabFeatureEnabled(key, enabled);
    revalidatePath("/admin/lab");
    revalidatePath("/lab");
    return { ok: true };
  } catch (err) {
    console.error("[admin] toggleLabFeature failed", err);
    Sentry.captureException(err);
    return { error: "일시적인 오류가 발생했어요. 다시 시도해주세요." };
  }
}
