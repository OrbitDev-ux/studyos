import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * requireCapability() is the ACTUAL enforcement point every admin Server
 * Action calls (requireCapability("banUser"), requireCapability("managePrompts"),
 * ...) — the permissions.ts matrix it delegates to has its own test, but this
 * covers the enforcement itself: does an insufficient role really get turned
 * away, and does a sufficient one really get through. Zero coverage existed
 * for this before (Codebase audit).
 */
class RedirectSignal extends Error {
  constructor(public target: string) {
    super(`NEXT_REDIRECT:${target}`);
  }
}

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((target: string) => {
    throw new RedirectSignal(target);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

const { cookies, headers } = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock("next/headers", () => ({ cookies, headers }));

const { verifyAdminSessionToken } = vi.hoisted(() => ({
  verifyAdminSessionToken: vi.fn(),
}));
vi.mock("@/lib/admin/session", () => ({
  ADMIN_SESSION_COOKIE: "admin_session",
  verifyAdminSessionToken,
}));

const { getSetting } = vi.hoisted(() => ({ getSetting: vi.fn() }));
vi.mock("@/lib/admin/settings", () => ({
  getSetting,
  SETTING_KEYS: { ADMIN_SESSION_EPOCH: "ADMIN_SESSION_EPOCH" },
}));

const { adminUser } = vi.hoisted(() => ({ adminUser: { findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { adminUser } }));

import { requireCapability } from "@/lib/admin/context";

const MODERATOR = { id: "admin-1", role: "MODERATOR", isActive: true };
const SUPER_ADMIN = { id: "admin-2", role: "SUPER_ADMIN", isActive: true };

function mockSignedInAs(admin: { id: string; role: string; isActive: boolean }) {
  cookies.mockResolvedValue({ get: () => ({ value: "valid-token" }) });
  verifyAdminSessionToken.mockResolvedValue({ sub: admin.id, iat: 1000 });
  getSetting.mockResolvedValue(0); // epoch — token issued after this passes
  adminUser.findUnique.mockResolvedValue(admin);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireCapability", () => {
  it("redirects a MODERATOR away from a SUPER_ADMIN-only capability instead of granting it", async () => {
    mockSignedInAs(MODERATOR);

    await expect(requireCapability("managePrompts")).rejects.toThrow(/NEXT_REDIRECT:\/admin$/);
  });

  it("lets a SUPER_ADMIN through the same capability", async () => {
    mockSignedInAs(SUPER_ADMIN);

    const admin = await requireCapability("managePrompts");

    expect(admin).toEqual(SUPER_ADMIN);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("lets a MODERATOR through a MODERATOR-level capability", async () => {
    mockSignedInAs(MODERATOR);

    const admin = await requireCapability("viewLogs");

    expect(admin).toEqual(MODERATOR);
  });

  it("redirects to sign-in when there is no valid admin session at all", async () => {
    cookies.mockResolvedValue({ get: () => undefined });
    verifyAdminSessionToken.mockResolvedValue(null);

    await expect(requireCapability("viewLogs")).rejects.toThrow(/NEXT_REDIRECT:\/admin-auth$/);
    expect(adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a session token issued before the global session-kill epoch", async () => {
    cookies.mockResolvedValue({ get: () => ({ value: "stale-token" }) });
    verifyAdminSessionToken.mockResolvedValue({ sub: "admin-1", iat: 100 });
    getSetting.mockResolvedValue(200); // epoch is AFTER this token was issued

    await expect(requireCapability("viewLogs")).rejects.toThrow(/NEXT_REDIRECT:\/admin-auth$/);
    expect(adminUser.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a deactivated admin even with an otherwise-valid session", async () => {
    mockSignedInAs({ ...SUPER_ADMIN, isActive: false });

    await expect(requireCapability("viewLogs")).rejects.toThrow(/NEXT_REDIRECT:\/admin-auth$/);
  });
});
