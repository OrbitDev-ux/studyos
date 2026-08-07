"use server";

import { revalidatePath } from "next/cache";
import {
  blockIpSchema,
  updateBanSchema,
  type BlockIpValues,
  type UpdateBanValues,
} from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { getRequestIp, requireCapability } from "@/lib/admin/context";
import { setSetting, SETTING_KEYS } from "@/lib/admin/settings";
import { normalizeIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

/**
 * Recovery shortcut (⌘+Option+3): lift the block on the *caller's own* IP so a
 * locked-out operator can reach admin sign-in again. Ungated on purpose — an
 * IP block precedes any admin session. Deactivates (keeps the record) rather
 * than deleting, and only ever touches the caller's IP.
 */
export async function clearMyIpBlock(): Promise<{ removed: number }> {
  const ip = await getRequestIp();
  if (ip === "unknown") return { removed: 0 };

  const result = await prisma.blockedIp.updateMany({
    where: { ip, active: true },
    data: { active: false },
  });
  if (result.count > 0) {
    await logAdminActivity({
      action: ADMIN_ACTIONS.IP_UNBLOCK,
      targetType: "ip",
      targetId: ip,
      detail: { via: "recovery_shortcut" },
      ip,
    });
    revalidatePath("/admin/security");
  }
  return { removed: result.count };
}

// ─── Super-admin ban management ───────────────────────────────────────────────

/** Create or re-activate a ban. Permanent, or time-limited via durationHours.
 * The IP is normalized so it matches what the login check detects. */
export async function blockIp(values: BlockIpValues): Promise<Result> {
  const admin = await requireCapability("manageIpBans");
  const parsed = blockIpSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const ip = normalizeIp(parsed.data.ip);
  if (ip === "unknown") return { error: "IP 형식이 올바르지 않습니다." };

  const permanent = parsed.data.permanent;
  const expiresAt =
    !permanent && parsed.data.durationHours
      ? new Date(Date.now() + parsed.data.durationHours * 60 * 60 * 1000)
      : null;
  if (!permanent && !expiresAt) return { error: "차단 기간을 입력해주세요." };

  const existing = await prisma.blockedIp.findUnique({ where: { ip } });
  if (existing?.active) return { error: "이미 차단된 IP입니다." };

  await prisma.blockedIp.upsert({
    where: { ip },
    create: {
      ip,
      reason: parsed.data.reason || null,
      permanent,
      expiresAt,
      active: true,
      createdById: admin.id,
    },
    update: {
      reason: parsed.data.reason || null,
      permanent,
      expiresAt,
      active: true,
      createdById: admin.id,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_BLOCK,
    targetType: "ip",
    targetId: ip,
    detail: { reason: parsed.data.reason || null, permanent, expiresAt },
  });

  revalidatePath("/admin/security");
  return {};
}

/** Release a ban (soft — keeps the record, marks inactive). */
export async function unblockIp(id: string): Promise<Result> {
  const admin = await requireCapability("manageIpBans");
  const existing = await prisma.blockedIp.findUnique({ where: { id } });
  if (!existing) return { error: "차단 기록을 찾을 수 없습니다." };

  await prisma.blockedIp.update({ where: { id }, data: { active: false } });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_UNBLOCK,
    targetType: "ip",
    targetId: existing.ip,
  });

  revalidatePath("/admin/security");
  return {};
}

/** Permanently delete a ban record. */
export async function deleteBan(id: string): Promise<Result> {
  const admin = await requireCapability("manageIpBans");
  const existing = await prisma.blockedIp.findUnique({ where: { id } });
  if (!existing) return { error: "차단 기록을 찾을 수 없습니다." };

  await prisma.blockedIp.delete({ where: { id } });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_UNBLOCK,
    targetType: "ip",
    targetId: existing.ip,
    detail: { deleted: true },
  });

  revalidatePath("/admin/security");
  return {};
}

/** Edit a ban's reason. */
export async function updateBanReason(values: UpdateBanValues): Promise<Result> {
  const admin = await requireCapability("manageIpBans");
  const parsed = updateBanSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const existing = await prisma.blockedIp.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { error: "차단 기록을 찾을 수 없습니다." };

  await prisma.blockedIp.update({
    where: { id: parsed.data.id },
    data: { reason: parsed.data.reason || null },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.IP_BLOCK,
    targetType: "ip",
    targetId: existing.ip,
    detail: { edited: true, reason: parsed.data.reason || null },
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
