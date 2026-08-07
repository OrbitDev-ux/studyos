"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { invalidateMaintenanceCache, setSetting, SETTING_KEYS } from "@/lib/admin/settings";

type Result = { error?: string };

export async function setMaintenanceMode(
  enabled: boolean,
  message?: string,
): Promise<Result> {
  const admin = await requireCapability("manageSystem");
  await setSetting(SETTING_KEYS.MAINTENANCE_MODE, enabled, admin.id);
  if (message !== undefined) {
    await setSetting(SETTING_KEYS.MAINTENANCE_MESSAGE, message, admin.id);
  }
  // Drop the TTL cache so the toggle applies on the next request immediately.
  invalidateMaintenanceCache();

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.MAINTENANCE_TOGGLE,
    detail: { enabled },
  });

  revalidatePath("/", "layout");
  return {};
}

/** Purge the full route/data cache. `revalidatePath("/", "layout")` busts
 * every cached route under the root layout. */
export async function clearCache(): Promise<Result> {
  const admin = await requireCapability("manageSystem");
  revalidatePath("/", "layout");

  await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.CACHE_CLEAR });
  return {};
}

/** Invalidate every admin session by advancing the session epoch. */
export async function clearAllAdminSessions(): Promise<Result> {
  const admin = await requireCapability("manageSystem");
  await setSetting(SETTING_KEYS.ADMIN_SESSION_EPOCH, Date.now(), admin.id);

  await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.SESSION_CLEAR });

  revalidatePath("/admin");
  return {};
}
