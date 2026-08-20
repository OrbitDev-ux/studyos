"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { aiSettingsSchema, type AiSettingsValues } from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { getSetting, setSetting, SETTING_KEYS } from "@/lib/admin/settings";

type Result = { error?: string };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

export async function updateAiSettings(values: AiSettingsValues): Promise<Result> {
  const admin = await requireCapability("manageAi");
  const parsed = aiSettingsSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  try {
    const wasEnabled = await getSetting<boolean>(SETTING_KEYS.AI_ENABLED);

    await setSetting(SETTING_KEYS.AI_ENABLED, parsed.data.enabled, admin.id);
    await setSetting(SETTING_KEYS.AI_MODEL, parsed.data.model, admin.id);

    if (wasEnabled !== parsed.data.enabled) {
      await logAdminActivity({
        adminId: admin.id,
        action: ADMIN_ACTIONS.AI_TOGGLE,
        detail: { enabled: parsed.data.enabled },
      });
    }
    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.AI_SETTINGS_UPDATE,
      detail: { model: parsed.data.model },
    });

    revalidatePath("/admin/ai");
    return {};
  } catch (err) {
    console.error("[admin] updateAiSettings failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}
