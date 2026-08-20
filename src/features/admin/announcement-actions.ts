"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { announcementSchema, type AnnouncementValues } from "@/features/admin/schema";
import { broadcastToAllUsers } from "@/features/notifications/service";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import { requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";

type Result = { error?: string };

const GENERIC_ERROR = "일시적인 오류가 발생했어요. 다시 시도해주세요.";

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

  try {
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

    // Only an immediate publish notifies everyone right now — a *scheduled*
    // announcement has no background job that flips it live later in this
    // codebase (its "live" status is derived at read time, like Battle), so
    // there is no discrete moment to hang a notification on for that case.
    if (timing.publishedAt) {
      await broadcastToAllUsers({
        type: "system_announcement",
        title: created.title,
        body: created.body,
      });
    }

    revalidatePath("/admin/announcements");
    return {};
  } catch (err) {
    console.error("[admin] createAnnouncement failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function updateAnnouncement(
  id: string,
  values: AnnouncementValues,
): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");
  const parsed = announcementSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const timing = resolveTiming(parsed.data);
  if (timing.error) return { error: timing.error };

  try {
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return { error: "공지를 찾을 수 없습니다." };

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
  } catch (err) {
    console.error("[admin] updateAnnouncement failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function deleteAnnouncement(id: string): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");

  try {
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
  } catch (err) {
    console.error("[admin] deleteAnnouncement failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}

export async function toggleAnnouncementPin(id: string): Promise<Result> {
  const admin = await requireCapability("manageAnnouncements");

  try {
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
  } catch (err) {
    console.error("[admin] toggleAnnouncementPin failed", err);
    Sentry.captureException(err);
    return { error: GENERIC_ERROR };
  }
}
