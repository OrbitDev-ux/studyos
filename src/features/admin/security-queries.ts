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
  createdByName: string | null;
  createdAt: Date;
};

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
  return rows.map((row) => ({
    id: row.id,
    ip: row.ip,
    reason: row.reason,
    createdByName: row.createdBy?.name ?? row.createdBy?.email ?? null,
    createdAt: row.createdAt,
  }));
}
