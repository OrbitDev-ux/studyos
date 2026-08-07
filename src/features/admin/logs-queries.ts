import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { actionLabel } from "@/lib/admin/activity";
import type { ActivityRow } from "@/features/admin/queries";

export const LOGS_PAGE_SIZE = 25;

export type LogFilters = {
  action?: string;
  adminId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  q?: string;
  page?: number;
};

export type LogsResult = {
  rows: ActivityRow[];
  total: number;
  page: number;
  totalPages: number;
};

function buildWhere(filters: LogFilters): Prisma.AdminActivityLogWhereInput {
  const where: Prisma.AdminActivityLogWhereInput = {};
  if (filters.action) where.action = filters.action;
  if (filters.adminId) where.adminId = filters.adminId;

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) createdAt.lte = new Date(`${filters.to}T23:59:59.999`);
    where.createdAt = createdAt;
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { detail: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function getActivityLogs(filters: LogFilters): Promise<LogsResult> {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildWhere(filters);

  const [total, logs] = await Promise.all([
    prisma.adminActivityLog.count({ where }),
    prisma.adminActivityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * LOGS_PAGE_SIZE,
      take: LOGS_PAGE_SIZE,
      include: { admin: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    rows: logs.map((row) => ({
      id: row.id,
      action: row.action,
      actionLabel: actionLabel(row.action),
      adminName: row.admin?.name ?? row.admin?.email ?? null,
      targetType: row.targetType,
      targetId: row.targetId,
      detail: row.detail,
      ip: row.ip,
      createdAt: row.createdAt,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE)),
  };
}

/** Active admins for the log filter's "관리자" dropdown. */
export async function getAdminOptions(): Promise<{ id: string; label: string }[]> {
  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true },
  });
  return admins.map((a) => ({ id: a.id, label: a.name ?? a.email }));
}
