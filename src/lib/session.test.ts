import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getCurrentUserOrNull() must mirror requireCurrentUser()'s auth/ban/session-
 * invalidation checks exactly, but resolve to null instead of calling
 * redirect() — Route Handlers reached via fetch() need a plain 401 JSON
 * response, not a redirect fetch would silently follow (see the doc comment
 * on getCurrentUserOrNull() in session.ts).
 *
 * The user resolution went through the Supabase anon-REST client before the
 * trust-boundary migration; it now reads via Prisma (owner role). These tests
 * mock prisma.user.findUnique.
 */
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));

const { prisma } = vi.hoisted(() => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { getCurrentUserOrNull } from "@/lib/session";

function fullUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    name: "학생",
    email: "student@example.com",
    image: null,
    timezone: "Asia/Seoul",
    school: null,
    locale: null,
    plan: "TRIAL",
    subscriptionStatus: "TRIALING",
    trialStartedAt: new Date("2026-01-01T00:00:00Z"),
    trialEndsAt: new Date("2026-01-08T00:00:00Z"),
    adminPlanOverride: null,
    adminPlanOverrideEnabled: false,
    bannedAt: null,
    passwordChangedAt: null,
    ...overrides,
  };
}

function mappedUser() {
  return {
    id: "user-1",
    name: "학생",
    email: "student@example.com",
    image: null,
    timezone: "Asia/Seoul",
    school: null,
    locale: null,
    plan: "TRIAL",
    subscriptionStatus: "TRIALING",
    trialStartedAt: "2026-01-01T00:00:00.000Z",
    trialEndsAt: "2026-01-08T00:00:00.000Z",
    adminPlanOverride: null,
    adminPlanOverrideEnabled: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserOrNull", () => {
  it("returns null when there is no session — no DB call made", async () => {
    auth.mockResolvedValue(null);

    const user = await getCurrentUserOrNull();

    expect(user).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the user row on a valid session", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    prisma.user.findUnique.mockResolvedValue(fullUserRow());

    const user = await getCurrentUserOrNull();

    expect(user).toEqual(mappedUser());
  });

  it("returns null for a deleted-account row instead of throwing", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });

  it("rethrows an unexpected DB error instead of misreporting it as unauthenticated", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    prisma.user.findUnique.mockRejectedValue(new Error("connection refused"));

    await expect(getCurrentUserOrNull()).rejects.toThrow("connection refused");
  });

  it("returns null for a banned account", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    prisma.user.findUnique.mockResolvedValue(fullUserRow({ bannedAt: new Date() }));

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });

  it("returns null for a session issued before a password change", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    prisma.user.findUnique.mockResolvedValue(
      fullUserRow({ passwordChangedAt: new Date("2026-01-01T00:00:00Z") }),
    );

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });
});