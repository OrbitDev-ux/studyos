import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/system/health must reject an unauthorized caller even if they hit
 * the route directly (§7 — UI hiding a button is not a security boundary),
 * and must never leak an internal detail through a thrown error.
 */
const { getCurrentAdmin } = vi.hoisted(() => ({ getCurrentAdmin: vi.fn() }));
vi.mock("@/lib/admin/context", () => ({ getCurrentAdmin }));

const { can } = vi.hoisted(() => ({ can: vi.fn() }));
vi.mock("@/lib/admin/permissions", () => ({ can }));

const { getSystemHealth } = vi.hoisted(() => ({ getSystemHealth: vi.fn() }));
vi.mock("@/features/admin/status", () => ({ getSystemHealth }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/system/health", () => {
  it("returns 401 when there is no admin session at all", async () => {
    getCurrentAdmin.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(can).not.toHaveBeenCalled();
    expect(getSystemHealth).not.toHaveBeenCalled();
  });

  it("returns 403 when the signed-in admin lacks the manageSystem capability", async () => {
    getCurrentAdmin.mockResolvedValue({ id: "admin-1", role: "MODERATOR" });
    can.mockReturnValue(false);

    const res = await GET();

    expect(res.status).toBe(403);
    expect(getSystemHealth).not.toHaveBeenCalled();
  });

  it("returns the health snapshot for an authorized admin", async () => {
    getCurrentAdmin.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN" });
    can.mockReturnValue(true);
    const snapshot = {
      overall: { status: "OPERATIONAL", checkedAt: "2026-01-01T00:00:00.000Z" },
      services: [
        {
          id: "web",
          category: "core",
          critical: true,
          status: "OPERATIONAL",
          latencyMs: 1,
          reason: "ok",
          checkedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    getSystemHealth.mockResolvedValue(snapshot);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(snapshot);
    expect(can).toHaveBeenCalledWith("SUPER_ADMIN", "manageSystem");
  });
});
