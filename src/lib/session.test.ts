import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getCurrentUserOrNull() must mirror requireCurrentUser()'s auth/ban/session-
 * invalidation checks exactly, but resolve to null instead of calling
 * redirect() — Route Handlers reached via fetch() need a plain 401 JSON
 * response, not a redirect fetch would silently follow (see the doc comment
 * on getCurrentUserOrNull() in session.ts).
 */
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from })) }));

import { getCurrentUserOrNull } from "@/lib/session";

function mockUserQuery(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  from.mockReturnValue({ select });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserOrNull", () => {
  it("returns null when there is no session — no DB call made", async () => {
    auth.mockResolvedValue(null);

    const user = await getCurrentUserOrNull();

    expect(user).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the user row on a valid session", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    mockUserQuery({
      data: { id: "user-1", bannedAt: null, passwordChangedAt: null },
      error: null,
    });

    const user = await getCurrentUserOrNull();

    expect(user).toEqual({ id: "user-1", bannedAt: null, passwordChangedAt: null });
  });

  it("returns null for a deleted-account row (PGRST116) instead of throwing", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    mockUserQuery({ data: null, error: { code: "PGRST116", message: "not found" } });

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });

  it("rethrows an unexpected DB error instead of misreporting it as unauthenticated", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    mockUserQuery({ data: null, error: { code: "500", message: "connection refused" } });

    await expect(getCurrentUserOrNull()).rejects.toEqual({
      code: "500",
      message: "connection refused",
    });
  });

  it("returns null for a banned account", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    mockUserQuery({
      data: { id: "user-1", bannedAt: "2026-01-01T00:00:00Z", passwordChangedAt: null },
      error: null,
    });

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });

  it("returns null for a session issued before a password change", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", loginAt: 1000 } });
    mockUserQuery({
      data: { id: "user-1", bannedAt: null, passwordChangedAt: "2026-01-01T00:00:00Z" },
      error: null,
    });

    await expect(getCurrentUserOrNull()).resolves.toBeNull();
  });
});
