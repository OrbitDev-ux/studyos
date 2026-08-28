import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Status Dashboard health-check domain. Covers the required cases from the
 * implementation spec: all-operational, non-critical/critical DOWN, a check
 * throwing (failure isolation), timeout handling, and real latency
 * measurement — plus that no sensitive detail ever appears in a result.
 */
vi.mock("server-only", () => ({}));

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));

const { getAllSettings } = vi.hoisted(() => ({ getAllSettings: vi.fn() }));
vi.mock("@/lib/admin/settings", () => ({ getAllSettings }));

const { activeProviderName } = vi.hoisted(() => ({ activeProviderName: vi.fn() }));
vi.mock("@/features/ai/providers", () => ({ activeProviderName }));

import {
  checkAi,
  checkAuth,
  checkDatabase,
  checkWeb,
  computeOverallStatus,
  getSystemHealth,
  runCheck,
  type ServiceHealth,
} from "@/features/admin/status";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
});

function service(overrides: Partial<ServiceHealth>): ServiceHealth {
  return {
    id: "svc",
    category: "core",
    critical: false,
    status: "OPERATIONAL",
    latencyMs: 1,
    reason: "ok",
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("computeOverallStatus", () => {
  it("is OPERATIONAL when every service is operational", () => {
    const services = [
      service({ id: "web", critical: true }),
      service({ id: "database", critical: true }),
    ];
    expect(computeOverallStatus(services)).toBe("OPERATIONAL");
  });

  it("is DEGRADED when a non-critical service is DOWN", () => {
    const services = [
      service({ id: "web", critical: true }),
      service({ id: "ai", critical: false, status: "DOWN", reason: "disabled" }),
    ];
    expect(computeOverallStatus(services)).toBe("DEGRADED");
  });

  it("is DOWN when a critical service is DOWN", () => {
    const services = [
      service({ id: "web", critical: true }),
      service({ id: "database", critical: true, status: "DOWN", reason: "query_failed" }),
    ];
    expect(computeOverallStatus(services)).toBe("DOWN");
  });

  it("is DEGRADED (never silently OPERATIONAL) when a service is UNKNOWN", () => {
    const services = [
      service({ id: "web", critical: true }),
      service({ id: "auth", critical: true, status: "UNKNOWN", reason: "unexpected_error" }),
    ];
    expect(computeOverallStatus(services)).toBe("DEGRADED");
  });

  it("a critical DOWN wins over an unrelated non-critical DEGRADED", () => {
    const services = [
      service({ id: "database", critical: true, status: "DOWN", reason: "query_failed" }),
      service({ id: "ai", critical: false, status: "DEGRADED", reason: "slow" }),
    ];
    expect(computeOverallStatus(services)).toBe("DOWN");
  });
});

describe("runCheck — failure isolation", () => {
  it("turns a thrown error into UNKNOWN, never propagating it", async () => {
    const result = await runCheck("flaky", "core", true, async () => {
      throw new Error("boom — should never leak to the caller");
    });
    expect(result.status).toBe("UNKNOWN");
    expect(result.reason).toBe("unexpected_error");
    // The raw Error/message must not appear anywhere in the result.
    expect(JSON.stringify(result)).not.toContain("boom");
  });

  it("resolves to DOWN/timeout when the check never settles within timeoutMs", async () => {
    const hangingForever = () => new Promise<never>(() => {});
    const result = await runCheck("hangs", "core", true, hangingForever, 20);
    expect(result.status).toBe("DOWN");
    expect(result.reason).toBe("timeout");
  });

  it("measures real elapsed latency (not a fabricated constant)", async () => {
    const result = await runCheck("slow-ish", "core", false, async () => {
      await new Promise((r) => setTimeout(r, 15));
      return { status: "OPERATIONAL" as const, reason: "ok" as const };
    });
    expect(result.latencyMs).toBeGreaterThanOrEqual(10);
  });

  it("passes through a successful, on-time result untouched", async () => {
    const result = await runCheck("web", "core", true, checkWeb);
    expect(result).toMatchObject({ id: "web", status: "OPERATIONAL", reason: "ok" });
  });
});

describe("checkDatabase", () => {
  it("is OPERATIONAL when the probe query succeeds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    expect(await checkDatabase()).toEqual({ status: "OPERATIONAL", reason: "ok" });
  });

  it("is DOWN when the probe query throws, without leaking the raw error", async () => {
    queryRaw.mockRejectedValue(new Error("password authentication failed for user \"prod\""));
    const result = await checkDatabase();
    expect(result).toEqual({ status: "DOWN", reason: "query_failed" });
    expect(JSON.stringify(result)).not.toContain("password");
  });
});

describe("checkAuth", () => {
  it("is OPERATIONAL when AUTH_SECRET is set", async () => {
    process.env.AUTH_SECRET = "a-real-secret";
    expect(await checkAuth()).toEqual({ status: "OPERATIONAL", reason: "ok" });
  });

  it("is DOWN when AUTH_SECRET is missing", async () => {
    delete process.env.AUTH_SECRET;
    expect(await checkAuth()).toEqual({ status: "DOWN", reason: "not_configured" });
  });
});

describe("checkAi", () => {
  it("is DOWN with reason 'disabled' when the admin kill-switch is off", async () => {
    getAllSettings.mockResolvedValue({ aiEnabled: false, aiModel: "x" });
    expect(await checkAi()).toEqual({ status: "DOWN", reason: "disabled" });
  });

  it("is DOWN with reason 'not_configured' when enabled but the provider key is missing", async () => {
    getAllSettings.mockResolvedValue({ aiEnabled: true, aiModel: "x" });
    activeProviderName.mockReturnValue("groq");
    delete process.env.GROQ_API_KEY;
    expect(await checkAi()).toEqual({ status: "DOWN", reason: "not_configured" });
  });

  it("is OPERATIONAL when enabled and the active provider's key is present", async () => {
    getAllSettings.mockResolvedValue({ aiEnabled: true, aiModel: "x" });
    activeProviderName.mockReturnValue("groq");
    process.env.GROQ_API_KEY = "gsk_fake";
    expect(await checkAi()).toEqual({ status: "OPERATIONAL", reason: "ok" });
  });

  it("checks GEMINI_API_KEY instead when gemini is the active provider", async () => {
    getAllSettings.mockResolvedValue({ aiEnabled: true, aiModel: "x" });
    activeProviderName.mockReturnValue("gemini");
    delete process.env.GEMINI_API_KEY;
    process.env.GROQ_API_KEY = "gsk_fake"; // must be ignored for gemini
    expect(await checkAi()).toEqual({ status: "DOWN", reason: "not_configured" });
  });
});

describe("getSystemHealth", () => {
  it("aggregates independently — one failing check doesn't affect the others", async () => {
    queryRaw.mockRejectedValue(new Error("db down"));
    getAllSettings.mockResolvedValue({ aiEnabled: true, aiModel: "x" });
    activeProviderName.mockReturnValue("groq");
    process.env.GROQ_API_KEY = "gsk_fake";
    process.env.AUTH_SECRET = "a-real-secret";

    const snapshot = await getSystemHealth();

    const byId = new Map(snapshot.services.map((s) => [s.id, s]));
    expect(byId.get("database")?.status).toBe("DOWN");
    expect(byId.get("web")?.status).toBe("OPERATIONAL");
    expect(byId.get("auth")?.status).toBe("OPERATIONAL");
    expect(byId.get("ai")?.status).toBe("OPERATIONAL");
    // Database is critical -> overall DOWN, computed via computeOverallStatus.
    expect(snapshot.overall.status).toBe("DOWN");
  });

  it("never includes a raw error/stack/secret value in its output", async () => {
    queryRaw.mockRejectedValue(
      new Error("connect ECONNREFUSED postgres://user:hunter2@db.internal:5432/prod"),
    );
    getAllSettings.mockResolvedValue({ aiEnabled: true, aiModel: "x" });
    activeProviderName.mockReturnValue("groq");
    process.env.GROQ_API_KEY = "gsk_fake";
    process.env.AUTH_SECRET = "a-real-secret";

    const snapshot = await getSystemHealth();
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("ECONNREFUSED");
    expect(serialized).not.toContain("postgres://");
  });
});
