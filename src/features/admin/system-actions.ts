"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { setSetting, SETTING_KEYS } from "@/lib/admin/settings";
import { setMaintenance } from "@/lib/maintenance";

type Result = { error?: string };

/** Toggle maintenance and/or update its title/message (super admin only).
 * Persists to the Maintenance singleton read by both the middleware (Edge) and
 * the app. Any omitted field is left unchanged. */
export async function setMaintenanceMode(input: {
  enabled?: boolean;
  title?: string;
  message?: string;
}): Promise<Result> {
  const admin = await requireCapability("manageSystem");

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
