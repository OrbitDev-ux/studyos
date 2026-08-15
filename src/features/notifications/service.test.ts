import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "@/features/notifications/service";

/**
 * Mocks the Prisma boundary (no real DB — matches this app's vitest scope of
 * "pure modules only, no DB/network"; a mock has neither) to directly assert
 * the one security property §7 of the spec cares about: every mutation's
 * `where` clause is scoped to the caller-verified `userId`, so a client that
 * knows/guesses another user's notificationId can never read or mutate it —
 * not because some earlier check happened to run, but because the query
 * itself cannot match a row it doesn't own.
 *
 * `vi.mock` factories are hoisted above all top-level code, so the mock
 * objects themselves must be created via `vi.hoisted` rather than as plain
 * consts above the factory (referencing an un-hoisted const from inside a
 * hoisted factory throws a TDZ ReferenceError).
 */
const { notification, user } = vi.hoisted(() => ({
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { notification, user } }));
vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markAsRead", () => {
  it("scopes the update to (id, userId) — never id alone", async () => {
    notification.updateMany.mockResolvedValue({ count: 1 });
    await service.markAsRead("notif-1", "user-1");
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-1", isRead: false },
      data: expect.objectContaining({ isRead: true }),
    });
  });
});

describe("markAllAsRead", () => {
  it("scopes to the given userId only", async () => {
    notification.updateMany.mockResolvedValue({ count: 3 });
    await service.markAllAsRead("user-1");
    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: expect.objectContaining({ isRead: true }),
    });
  });
});

describe("deleteNotification", () => {
  it("scopes the delete to (id, userId) — a foreign id matches nothing", async () => {
    notification.deleteMany.mockResolvedValue({ count: 0 });
    await service.deleteNotification("notif-1", "user-2");
    expect(notification.deleteMany).toHaveBeenCalledWith({ where: { id: "notif-1", userId: "user-2" } });
  });
});

describe("getNotifications / getRecentNotifications", () => {
  it("never queries without a userId filter", async () => {
    notification.count.mockResolvedValue(0);
    notification.findMany.mockResolvedValue([]);
    await service.getNotifications("user-1", 1);
    expect(notification.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("getRecentNotifications also filters by userId", async () => {
    notification.findMany.mockResolvedValue([]);
    await service.getRecentNotifications("user-1");
    expect(notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });
});

describe("createNotification", () => {
  it("does nothing when the recipient no longer exists", async () => {
    user.findUnique.mockResolvedValue(null);
    await service.createNotification({ userId: "gone", type: "dm_message", title: "x" });
    expect(notification.create).not.toHaveBeenCalled();
  });

  it("does not create a row when the recipient disabled that category", async () => {
    user.findUnique.mockResolvedValue({ notificationPreferences: { dm: false } });
    await service.createNotification({ userId: "user-1", type: "dm_message", title: "x" });
    expect(notification.create).not.toHaveBeenCalled();
  });

  it("creates a row when enabled (the default)", async () => {
    user.findUnique.mockResolvedValue({ notificationPreferences: null });
    notification.create.mockResolvedValue({});
    await service.createNotification({ userId: "user-1", type: "dm_message", title: "x" });
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", type: "dm_message" }) }),
    );
  });
});

describe("createNotifications (bulk)", () => {
  it("drops recipients who no longer exist and those with the category disabled", async () => {
    user.findMany.mockResolvedValue([
      { id: "user-1", notificationPreferences: null },
      { id: "user-2", notificationPreferences: { friend: false } },
      // user-3 intentionally absent — simulates a deleted/unknown user
    ]);
    notification.createMany.mockResolvedValue({ count: 1 });

    await service.createNotifications([
      { userId: "user-1", type: "friend_request", title: "a" },
      { userId: "user-2", type: "friend_request", title: "b" },
      { userId: "user-3", type: "friend_request", title: "c" },
    ]);

    expect(notification.createMany).toHaveBeenCalledTimes(1);
    const call = notification.createMany.mock.calls.at(0)?.at(0) as { data: { userId: string }[] };
    expect(call.data).toHaveLength(1);
    expect(call.data[0]).toMatchObject({ userId: "user-1" });
  });

  it("does nothing for an empty input (no query at all)", async () => {
    await service.createNotifications([]);
    expect(user.findMany).not.toHaveBeenCalled();
    expect(notification.createMany).not.toHaveBeenCalled();
  });
});
