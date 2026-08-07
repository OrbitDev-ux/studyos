import type { AdminRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { actionLabel } from "@/lib/admin/activity";

export type AdminListRow = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  createdByName: string | null;
  lastAction: { label: string; at: Date } | null;
};

export async function getAdmins(): Promise<AdminListRow[]> {
  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      createdBy: { select: { name: true, email: true } },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { action: true, createdAt: true },
      },
    },
  });

  return admins.map((admin) => {
    const last = admin.activityLogs[0];
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
      createdByName: admin.createdBy?.name ?? admin.createdBy?.email ?? null,
      lastAction: last ? { label: actionLabel(last.action), at: last.createdAt } : null,
    };
  });
}
