"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { setSetting, SETTING_KEYS } from "@/lib/admin/settings";
import { setMaintenance } from "@/lib/maintenance";

type Result = { error?: string };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

/** Toggle maintenance and/or update its title/message (super admin only).
 * Persists to the Maintenance singleton read by both the middleware (Edge) and
 * the app. Any omitted field is left unchanged. */
export async function setMaintenanceMode(input: {
  enabled?: boolean;
  title?: string;
  message?: string;
}): Promise<Result> {
  const admin = await requireCapability("manageSystem");

  try {
    await setMaintenance(
      {
        enabled: input.enabled,
        title: input.title,
        message: input.message,
      },
      admin.id,
    );

    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.MAINTENANCE_TOGGLE,
      detail: { enabled: input.enabled },
    });

    revalidatePath("/", "layout");
    return {};
  } catch (err) {
    console.error("[admin] setMaintenanceMode failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

/** Purge the full route/data cache. `revalidatePath("/", "layout")` busts
 * every cached route under the root layout. */
export async function clearCache(): Promise<Result> {
  const admin = await requireCapability("manageSystem");

  try {
    revalidatePath("/", "layout");
    await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.CACHE_CLEAR });
    return {};
  } catch (err) {
    console.error("[admin] clearCache failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

/** Invalidate every admin session by advancing the session epoch. */
export async function clearAllAdminSessions(): Promise<Result> {
  const admin = await requireCapability("manageSystem");

  try {
    await setSetting(SETTING_KEYS.ADMIN_SESSION_EPOCH, Date.now(), admin.id);

    await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.SESSION_CLEAR });

    revalidatePath("/admin");
    return {};
  } catch (err) {
    console.error("[admin] clearAllAdminSessions failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}
