import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { getCurrentAdmin } from "@/lib/admin/context";
import { can } from "@/lib/admin/permissions";
import { setMaintenance } from "@/lib/maintenance";

const bodySchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().max(120).optional(),
  message: z.string().max(2000).optional(),
});

// PATCH /api/system/maintenance — super admin only.
// Body: { enabled?, title?, message? }. All checks are server-side.
export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(admin.role, "manageSystem")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const state = await setMaintenance(parsed.data, admin.id);
  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.MAINTENANCE_TOGGLE,
    detail: parsed.data,
  });

  return NextResponse.json({
    maintenance: state.enabled,
    title: state.title ?? "",
    message: state.message ?? "",
  });
}
