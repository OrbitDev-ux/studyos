"use server";

import { revalidatePath } from "next/cache";
import { announcementSchema, type AnnouncementValues } from "@/features/admin/schema";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

// Translate the form's publishNow/scheduledAt into the two nullable columns:
// publishedAt set = live now; scheduledAt set = goes live later; both null =
// draft.
function resolveTiming(values: AnnouncementValues): {
  publishedAt: Date | null;
  scheduledAt: Date | null;
  error?: string;
} {
  if (values.publishNow) return { publishedAt: new Date(), scheduledAt: null };
  if (values.scheduledAt) {
    const when = new Date(values.scheduledAt);
    if (Number.isNaN(when.getTime()))
      return {
        publishedAt: null,
        scheduledAt: null,
        error: "예약 시간이 올바르지 않습니다.",
      };
    return { publishedAt: null, scheduledAt: when };
  }
  return { publishedAt: null, scheduledAt: null };
}

export async function createAnnouncement(values: AnnouncementValues): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const timing = resolveTiming(parsed.data);
  if (timing.error) return { error: timing.error };

  const created = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      isPinned: parsed.data.isPinned,
      publishedAt: timing.publishedAt,
      scheduledAt: timing.scheduledAt,
      authorId: admin.id,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.ANNOUNCEMENT_CREATE,
    targetType: "announcement",
    targetId: created.id,
    detail: { title: created.title },
  });

  revalidatePath("/admin/announcements");
  return {};
}

export async function updateAnnouncement(
  id: string,
  values: AnnouncementValues,
): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "공지를 찾을 수 없습니다." };

  const timing = resolveTiming(parsed.data);
  if (timing.error) return { error: timing.error };

  await prisma.announcement.update({
    where: { id },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      isPinned: parsed.data.isPinned,
      publishedAt: timing.publishedAt,
      scheduledAt: timing.scheduledAt,
    },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.ANNOUNCEMENT_UPDATE,
    targetType: "announcement",
    targetId: id,
    detail: { title: parsed.data.title },
  });

  revalidatePath("/admin/announcements");
  return {};
}

export async function deleteAnnouncement(id: string): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "공지를 찾을 수 없습니다." };

  await prisma.announcement.delete({ where: { id } });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.ANNOUNCEMENT_DELETE,
    targetType: "announcement",
    targetId: id,
    detail: { title: existing.title },
  });

  revalidatePath("/admin/announcements");
  return {};
}

export async function toggleAnnouncementPin(id: string): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");
  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) return { error: "공지를 찾을 수 없습니다." };

  await prisma.announcement.update({
    where: { id },
    data: { isPinned: !existing.isPinned },
  });

  await logAdminActivity({
    adminId: admin.id,
    action: ADMIN_ACTIONS.ANNOUNCEMENT_UPDATE,
    targetType: "announcement",
    targetId: id,
    detail: { title: existing.title, pinned: !existing.isPinned },
  });

  revalidatePath("/admin/announcements");
  return {};
}
