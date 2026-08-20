import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { announcement } = vi.hoisted(() => ({
  announcement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { announcement } }));

const { requireCapability } = vi.hoisted(() => ({ requireCapability: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ requireCapability }));

const { logAdminActivity } = vi.hoisted(() => ({ logAdminActivity: vi.fn() }));
vi.mock("@/lib/admin/activity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/activity")>();
  return { ...actual, logAdminActivity };
});

const { broadcastToAllUsers } = vi.hoisted(() => ({ broadcastToAllUsers: vi.fn() }));
vi.mock("@/features/notifications/service", () => ({ broadcastToAllUsers }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import {
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementPin,
} from "@/features/admin/announcement-actions";

const ADMIN = { id: "admin-1", role: "ADMIN" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCapability.mockResolvedValue(ADMIN);
  logAdminActivity.mockResolvedValue(undefined);
  broadcastToAllUsers.mockResolvedValue(undefined);
});

describe("createAnnouncement", () => {
  it("broadcasts immediately when publishNow is set", async () => {
    announcement.create.mockResolvedValue({ id: "a1", title: "T", body: "B" });

    await createAnnouncement({
      title: "T",
      body: "B",
      isPinned: false,
      publishNow: true,
    });

    expect(broadcastToAllUsers).toHaveBeenCalledTimes(1);
  });

  it("does NOT broadcast for a scheduled (not-yet-live) announcement", async () => {
    announcement.create.mockResolvedValue({ id: "a1", title: "T", body: "B" });

    await createAnnouncement({
      title: "T",
      body: "B",
      isPinned: false,
      publishNow: false,
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    });

    expect(broadcastToAllUsers).not.toHaveBeenCalled();
  });

  it("rejects an invalid scheduled time before writing", async () => {
    const res = await createAnnouncement({
      title: "T",
      body: "B",
      isPinned: false,
      publishNow: false,
      scheduledAt: "not-a-date",
    });

    expect(res.error).toBe("예약 시간이 올바르지 않습니다.");
    expect(announcement.create).not.toHaveBeenCalled();
  });

  it("never throws when the DB write fails", async () => {
    announcement.create.mockRejectedValue(new Error("db down"));

    await expect(
      createAnnouncement({ title: "T", body: "B", isPinned: false, publishNow: true }),
    ).resolves.toEqual({ error: "일시적인 오류가 발생했어요. 다시 시도해주세요." });
  });
});

describe("deleteAnnouncement / toggleAnnouncementPin", () => {
  it("deleteAnnouncement 404s on a missing announcement", async () => {
    announcement.findUnique.mockResolvedValue(null);

    const res = await deleteAnnouncement("a1");

    expect(res.error).toBe("공지를 찾을 수 없습니다.");
    expect(announcement.delete).not.toHaveBeenCalled();
  });

  it("toggleAnnouncementPin flips the pin state and never throws on failure", async () => {
    announcement.findUnique.mockResolvedValue({ id: "a1", title: "T", isPinned: false });
    announcement.update.mockRejectedValue(new Error("db down"));

    await expect(toggleAnnouncementPin("a1")).resolves.toEqual({
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
    });
  });
});
