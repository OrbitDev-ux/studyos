"use server";

import { revalidatePath } from "next/cache";
import { blockIpSchema, type BlockIpValues } from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { setSetting, SETTING_KEYS } from "@/lib/admin/settings";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

export async function blockIp(values: BlockIpValues): Promise<Result> {
  const admin = await requireCapability("manageSecurity");
  const parsed = blockIpSchema.safeParse(values);
  if (!parsed.success) return { error: "IP 형식이 올바르지 않습니다." };

  const existing = await prisma.blockedIp.findUnique({ where: { ip: parsed.data.ip } });
  if (existing) return { error: "이미 차단된 IP입니다." };

  await prisma.blockedIp.create({
    data: {
      ip: parsed.data.ip,
      reason: parsed.data.reason || null,
      createdById: admin.id,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_BLOCK,
    targetType: "ip",
    targetId: parsed.data.ip,
    detail: { reason: parsed.data.reason || null },
  });

  revalidatePath("/admin/security");
  return {};
}

export async function unblockIp(id: string): Promise<Result> {
  const admin = await requireCapability("manageSecurity");
  const existing = await prisma.blockedIp.findUnique({ where: { id } });
  if (!existing) return { error: "차단 기록을 찾을 수 없습니다." };

  await prisma.blockedIp.delete({ where: { id } });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_UNBLOCK,
    targetType: "ip",
    targetId: existing.ip,
  });

  revalidatePath("/admin/security");
  return {};
}

/** Invalidate every issued admin session by advancing the epoch. The caller's
 * own cookie is included — they'll be signed out on the next request. */
export async function clearAdminSessions(): Promise<Result> {
  const admin = await requireCapability("manageSecurity");
  await setSetting(SETTING_KEYS.ADMIN_SESSION_EPOCH, Date.now(), admin.id);

  await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.SESSION_CLEAR });

  revalidatePath("/admin");
  return {};
}
