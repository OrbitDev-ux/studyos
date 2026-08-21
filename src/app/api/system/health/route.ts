import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin/context";
import { can } from "@/lib/admin/permissions";
import { getSystemHealth } from "@/features/admin/status";

/**
 * GET /api/system/health — admin-only Status Dashboard data feed.
 *
 * Deliberately separate from the existing public GET /api/system/status
 * (maintenance-mode probe only, no auth, no internal detail) — this one
 * carries per-service health and is gated exactly like every other
 * `manageSystem` admin surface (see PATCH /api/system/maintenance for the
 * identical getCurrentAdmin() + can() pattern this mirrors). No new
 * authorization system, and the client dashboard hitting this route directly
 * without a valid admin session gets the same 401/403 an unauthorized script
 * would.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(admin.role, "manageSystem")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await getSystemHealth();
  return NextResponse.json(snapshot);
}
