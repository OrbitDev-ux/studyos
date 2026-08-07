import { getRequestIp } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

export type LoginAttemptRow = {
  id: string;
  ip: string;
  email: string | null;
  success: boolean;
  createdAt: Date;
};

export type BlockedIpRow = {
  id: string;
  ip: string;
  reason: string | null;
  permanent: boolean;
  expiresAt: Date | null;
  active: boolean;
  /** Whether the ban actually blocks right now (active + not expired). */
  effective: boolean;
  createdByName: string | null;
  createdAt: Date;
};

/** The client IP the server currently sees — shown on the security page so an
 * admin bans the exact address the login check will compare against. */
export async function getCurrentIp(): Promise<string> {
  return getRequestIp();
}

export async function getAdminLoginHistory(limit = 20): Promise<LoginAttemptRow[]> {
  return prisma.adminLoginAttempt.findMany({
    where: { success: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, ip: true, email: true, success: true, createdAt: true },
  });
}

export async function getFailedLoginAttempts(limit = 20): Promise<LoginAttemptRow[]> {
  return prisma.adminLoginAttempt.findMany({
    where: { success: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, ip: true, email: true, success: true, createdAt: true },
  });
}

export async function getBlockedIps(): Promise<BlockedIpRow[]> {
  const rows = await prisma.blockedIp.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });
  const now = Date.now();
  return rows.map((row) => {
    const expired =
      !row.permanent && row.expiresAt ? row.expiresAt.getTime() <= now : false;
    return {
      id: row.id,
      ip: row.ip,
      reason: row.reason,
      permanent: row.permanent,
      expiresAt: row.expiresAt,
      active: row.active,
      effective: row.active && !expired,
      createdByName: row.createdBy?.name ?? row.createdBy?.email ?? null,
      createdAt: row.createdAt,
    };
  });
}
