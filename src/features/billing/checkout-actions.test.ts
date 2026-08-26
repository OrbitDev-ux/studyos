import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getBillingAuthConfig's same-plan guard: part of the plan-change safety
 * fix accompanying the applyPaymentEvent entitlement-grant fix. Blocks a
 * pointless re-checkout for the plan the user already holds — the deeper
 * duplicate-ACTIVE-subscription protection lives in applyPaymentEvent
 * (payment-service.test.ts), this is just the cheap up-front UX/safety net.
 */
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { isTossConfigured } = vi.hoisted(() => ({ isTossConfigured: vi.fn() }));
vi.mock("@/features/billing/toss-client", () => ({ isTossConfigured }));

import { getBillingAuthConfig } from "@/features/billing/checkout-actions";

const envBackup = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...envBackup, NEXT_PUBLIC_TOSS_CLIENT_KEY: "test-client-key" };
  isTossConfigured.mockReturnValue(true);
});

describe("getBillingAuthConfig", () => {
  it("rejects an invalid plan", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });

    const result = await getBillingAuthConfig("GOLD");

    expect(result).toEqual({ ok: false, error: "잘못된 플랜입니다." });
  });

  it("rejects re-checkout for the plan the user is already really on", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "PRO", email: "a@test.com" });

    const result = await getBillingAuthConfig("PRO");

    expect(result).toEqual({ ok: false, error: "이미 이용 중인 플랜이에요." });
  });

  it("allows checkout for a genuine upgrade (PRO -> PREMIUM)", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "PRO",
      email: "a@test.com",
      name: "Learner",
    });

    const result = await getBillingAuthConfig("PREMIUM");

    expect(result.ok).toBe(true);
  });

  it("allows a first checkout from TRIAL", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
      name: null,
    });

    const result = await getBillingAuthConfig("PRO");

    expect(result.ok).toBe(true);
  });

  it("degrades gracefully when Toss isn't configured, even for a legitimate upgrade", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });
    isTossConfigured.mockReturnValue(false);

    const result = await getBillingAuthConfig("PRO");

    expect(result).toEqual({ ok: false, error: "결제 기능은 아직 활성화되지 않았습니다." });
  });
});
