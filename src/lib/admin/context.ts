import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/session";
import { can, type Capability } from "@/lib/admin/permissions";

/** The signed-in admin, re-read from the DB so deactivation/role changes take
 * effect immediately even while an older session cookie is still valid.
 * Returns null when there is no valid session or the account is gone/disabled. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const payload = await verifyAdminSessionToken(token);
  if (!payload) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
  if (!admin || !admin.isActive) return null;
  return admin;
}

/** Like getCurrentAdmin but redirects to the sign-in screen when absent —
 * the standard guard at the top of every admin page and Server Action. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin-auth");
  return admin;
}

/** Guard that additionally enforces a capability; redirects unauthorized
 * admins back to the dashboard rather than exposing a forbidden view. */
export async function requireCapability(capability: Capability): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!can(admin.role, capability)) redirect("/admin");
  return admin;
}

/** Best-effort client IP from the proxy headers, shared by audit logging and
 * rate limiting. */
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return (forwardedFor.split(",")[0] ?? "unknown").trim();
  return headerList.get("x-real-ip") ?? "unknown";
}
