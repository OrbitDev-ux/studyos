"use server";

import { revalidatePath } from "next/cache";
import { hashPassword } from "@/features/auth/password";
import {
  banUserSchema,
  promoteUserSchema,
  type BanUserValues,
  type PromoteUserValues,
} from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

export async function banUser(values: BanUserValues): Promise<Result> {
  const admin = await requireCapability("banUser");
  const parsed = banUserSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  await prisma.user.update({
    where: { id: user.id },
    data: { bannedAt: new Date(), banReason: parsed.data.reason || null },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.USER_BAN,
    targetType: "user",
    targetId: user.id,
    detail: { email: user.email, reason: parsed.data.reason || null },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${user.id}`);
  return {};
}

export async function unbanUser(userId: string): Promise<Result> {
  const admin = await requireCapability("unbanUser");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  await prisma.user.update({
    where: { id: user.id },
    data: { bannedAt: null, banReason: null },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.USER_UNBAN,
    targetType: "user",
    targetId: user.id,
    detail: { email: user.email },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${user.id}`);
  return {};
}

/** Grant a regular user admin access by creating (or re-activating) an
 * AdminUser keyed on their email. SUPER_ADMIN only. */
export async function promoteUser(values: PromoteUserValues): Promise<Result> {
  const admin = await requireCapability("promoteUser");
  const parsed = promoteUserSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const existing = await prisma.adminUser.findUnique({ where: { email: user.email } });
  if (existing?.isActive) return { error: "이미 관리자로 지정된 사용자입니다." };

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.adminUser.upsert({
    where: { email: user.email },
    create: {
      email: user.email,
      name: user.name,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
      createdById: admin.id,
    },
    update: {
      isActive: true,
      role: parsed.data.role,
      passwordHash,
      createdById: admin.id,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.USER_PROMOTE,
    targetType: "user",
    targetId: user.id,
    detail: { email: user.email, role: parsed.data.role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${user.id}`);
  revalidatePath("/admin/admins");
  return {};
}

/** Revoke a user's admin access (deactivate their AdminUser row). SUPER_ADMIN
 * only; refuses to strip the caller's own access or the last super admin. */
export async function demoteUser(userId: string): Promise<Result> {
  const admin = await requireCapability("promoteUser");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const target = await prisma.adminUser.findUnique({ where: { email: user.email } });
  if (!target || !target.isActive) return { error: "관리자가 아닙니다." };
  if (target.id === admin.id)
    return { error: "자기 자신의 관리자 권한은 해제할 수 없습니다." };

  if (target.role === "SUPER_ADMIN") {
    const superAdmins = await prisma.adminUser.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    if (superAdmins <= 1) return { error: "마지막 슈퍼 관리자는 해제할 수 없습니다." };
  }

  await prisma.adminUser.update({ where: { id: target.id }, data: { isActive: false } });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.ADMIN_DELETE,
    targetType: "admin",
    targetId: target.id,
    detail: { email: user.email },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${user.id}`);
  revalidatePath("/admin/admins");
  return {};
}
