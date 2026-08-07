import { prisma } from "@/lib/prisma";
import { ADMIN_ACTIONS, actionLabel } from "@/lib/admin/activity";
import type { AdminNotification } from "@/features/admin/components/admin-header";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// ─── Header notifications ────────────────────────────────────────────────────

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const since = new Date(Date.now() - DAY_MS);
  const [errorCount, failedLogins] = await Promise.all([
    prisma.adminActivityLog.count({
      where: { action: ADMIN_ACTIONS.ERROR, createdAt: { gte: since } },
    }),
    prisma.adminLoginAttempt.count({
      where: { success: false, createdAt: { gte: since } },
    }),
  ]);

  const items: AdminNotification[] = [];
  if (errorCount > 0) {
    items.push({
      id: "errors",
      label: `최근 24시간 오류 ${errorCount}건`,
      href: "/admin/logs?action=error",
    });
  }
  if (failedLogins > 0) {
    items.push({
      id: "failed-logins",
      label: `로그인 실패 시도 ${failedLogins}건`,
      href: "/admin/security",
    });
  }
  return items;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DashboardStats = {
  totalUsers: number;
  todaySignups: number;
  activeUsers: number;
  bannedUsers: number;
  adminCount: number;
  recentLogins: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = startOfToday();
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const dayAgo = new Date(Date.now() - DAY_MS);

  const [totalUsers, todaySignups, bannedUsers, adminCount, recentLogins, activeGroups] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { bannedAt: { not: null } } }),
      prisma.adminUser.count({ where: { isActive: true } }),
      prisma.adminLoginAttempt.count({
        where: { success: true, createdAt: { gte: dayAgo } },
      }),
      // Active = studied at least once in the last 7 days.
      prisma.studySession.groupBy({
        by: ["userId"],
        where: { startedAt: { gte: weekAgo } },
      }),
    ]);

  return {
    totalUsers,
    todaySignups,
    activeUsers: activeGroups.length,
    bannedUsers,
    adminCount,
    recentLogins,
  };
}

export type ActivityRow = {
  id: string;
  action: string;
  actionLabel: string;
  adminName: string | null;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: Date;
};

export async function getRecentActivity(limit = 8): Promise<ActivityRow[]> {
  const rows = await prisma.adminActivityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, email: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actionLabel: actionLabel(row.action),
    adminName: row.admin?.name ?? row.admin?.email ?? null,
    targetType: row.targetType,
    targetId: row.targetId,
    detail: row.detail,
    ip: row.ip,
    createdAt: row.createdAt,
  }));
}

export async function getRecentErrors(limit = 5): Promise<ActivityRow[]> {
  const rows = await prisma.adminActivityLog.findMany({
    where: { action: ADMIN_ACTIONS.ERROR },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { name: true, email: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actionLabel: actionLabel(row.action),
    adminName: row.admin?.name ?? row.admin?.email ?? null,
    targetType: row.targetType,
    targetId: row.targetId,
    detail: row.detail,
    ip: row.ip,
    createdAt: row.createdAt,
  }));
}
