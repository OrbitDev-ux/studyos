"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/features/auth/password";
import {
  createAdminSchema,
  updateAdminRoleSchema,
  type CreateAdminValues,
  type UpdateAdminRoleValues,
} from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

/** Create a brand-new admin account (not tied to an existing user). Super
 * admin only. */
export async function createAdmin(values: CreateAdminValues): Promise<Result> {
  const admin = await requireCapability("manageAdmins");
  const parsed = createAdminSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  try {
    const existing = await prisma.adminUser.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing?.isActive) return { error: "이미 사용 중인 이메일입니다." };

    const passwordHash = await hashPassword(parsed.data.password);
    const created = await prisma.adminUser.upsert({
      where: { email: parsed.data.email },
      create: {
        email: parsed.data.email,
        name: parsed.data.name || null,
        passwordHash,
        role: parsed.data.role,
        isActive: true,
        createdById: admin.id,
      },
      update: {
        name: parsed.data.name || null,
        passwordHash,
        role: parsed.data.role,
        isActive: true,
        createdById: admin.id,
      },
    });

    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.ADMIN_CREATE,
      targetType: "admin",
      targetId: created.id,
      detail: { email: created.email, role: created.role },
    });

    revalidatePath("/admin/admins");
    return {};
  } catch (err) {
    console.error("[admin] createAdmin failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function updateAdminRole(values: UpdateAdminRoleValues): Promise<Result> {
  const admin = await requireCapability("manageAdmins");
  const parsed = updateAdminRoleSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  try {
    const target = await prisma.adminUser.findUnique({
      where: { id: parsed.data.adminId },
    });
    if (!target || !target.isActive) return { error: "관리자를 찾을 수 없습니다." };
    if (target.id === admin.id)
      return { error: "자기 자신의 역할은 변경할 수 없습니다." };

    // Don't let the last super admin be demoted out of that role.
    if (target.role === "SUPER_ADMIN" && parsed.data.role !== "SUPER_ADMIN") {
      const superAdmins = await prisma.adminUser.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (superAdmins <= 1)
        return { error: "마지막 슈퍼 관리자의 역할은 변경할 수 없습니다." };
    }

    await prisma.adminUser.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
    });

    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.ADMIN_ROLE_CHANGE,
      targetType: "admin",
      targetId: target.id,
      detail: { email: target.email, from: target.role, to: parsed.data.role },
    });

    revalidatePath("/admin/admins");
    return {};
  } catch (err) {
    console.error("[admin] updateAdminRole failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

/** Deactivate an admin. Super admin only; refuses to remove the caller or the
 * last active super admin. */
export async function deleteAdmin(adminId: string): Promise<Result> {
  const admin = await requireCapability("manageAdmins");

  try {
    const target = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!target || !target.isActive) return { error: "관리자를 찾을 수 없습니다." };
    if (target.id === admin.id) return { error: "자기 자신은 삭제할 수 없습니다." };

    if (target.role === "SUPER_ADMIN") {
      const superAdmins = await prisma.adminUser.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (superAdmins <= 1) return { error: "마지막 슈퍼 관리자는 삭제할 수 없습니다." };
    }

    await prisma.adminUser.update({
      where: { id: target.id },
      data: { isActive: false },
    });

    await logAdminActivity({
      adminId: admin.id,
      action: ADMIN_ACTIONS.ADMIN_DELETE,
      targetType: "admin",
      targetId: target.id,
      detail: { email: target.email },
    });

    revalidatePath("/admin/admins");
    revalidatePath("/admin/users");
    return {};
  } catch (err) {
    console.error("[admin] deleteAdmin failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}
