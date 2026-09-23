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

const { activeBillingProvider } = vi.hoisted(() => ({ activeBillingProvider: vi.fn() }));
vi.mock("@/features/billing/providers", () => ({ activeBillingProvider }));

const { createPolarCheckoutSession, polarProductIdForPlan } = vi.hoisted(() => ({
  createPolarCheckoutSession: vi.fn(),
  polarProductIdForPlan: vi.fn(),
}));
vi.mock("@/features/billing/polar-client", () => ({
  createPolarCheckoutSession,
  polarProductIdForPlan,
}));

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("@/features/analytics/capture", () => ({ capture }));

import { getBillingAuthConfig, startCheckout } from "@/features/billing/checkout-actions";

const envBackup = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...envBackup, NEXT_PUBLIC_TOSS_CLIENT_KEY: "test-client-key" };
  isTossConfigured.mockReturnValue(true);
});

describe("getBillingAuthConfig", () => {
  it("rejects an invalid plan", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
    });

    const result = await getBillingAuthConfig("GOLD");

    expect(result).toEqual({ ok: false, error: "잘못된 플랜입니다." });
  });

  it("rejects re-checkout for the plan the user is already really on", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "PRO",
      email: "a@test.com",
    });

    const result = await getBillingAuthConfig("PRO");

    expect(result).toEqual({ ok: false, error: "이미 이용 중인 플랜이에요." });
  });

  it("rejects a not-for-sale plan even as a genuine upgrade (PREMIUM)", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "PRO",
      email: "a@test.com",
      name: "Learner",
    });

    const result = await getBillingAuthConfig("PREMIUM");

    expect(result).toEqual({
      ok: false,
      error: "PREMIUM은 현재 판매하지 않는 플랜이에요.",
    });
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
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
    });
    isTossConfigured.mockReturnValue(false);

    const result = await getBillingAuthConfig("PRO");

    expect(result).toEqual({
      ok: false,
      error: "결제 기능은 아직 활성화되지 않았습니다.",
    });
  });
});

describe("startCheckout", () => {
  it("does not open a checkout for PREMIUM (not-for-sale) even when Polar is configured", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
      name: null,
    });

    const result = await startCheckout("PREMIUM");

    expect(result).toEqual({
      ok: false,
      error: "PREMIUM은 현재 판매하지 않는 플랜이에요.",
    });
    expect(createPolarCheckoutSession).not.toHaveBeenCalled();
    expect(polarProductIdForPlan).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("does not start a checkout for an unauthenticated caller (requireCurrentUser redirects first)", async () => {
    requireCurrentUser.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(startCheckout("PRO")).rejects.toThrow("NEXT_REDIRECT");
    expect(createPolarCheckoutSession).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("fires checkout_started only after the Polar session was actually created", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
      name: null,
    });
    activeBillingProvider.mockReturnValue("polar");
    polarProductIdForPlan.mockReturnValue("product_pro");
    createPolarCheckoutSession.mockResolvedValue({
      url: "https://sandbox-api.polar.sh/checkout/xyz",
    });

    const result = await startCheckout("PRO");

    expect(result).toMatchObject({ ok: true, kind: "polar" });
    expect(capture).toHaveBeenCalledWith({
      name: "checkout_started",
      props: { plan: "PRO", provider: "polar" },
    });
  });

  it("does not send a guest's synthetic email to Polar (invalid domain → 422) so the checkout can open", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-guest",
      plan: "TRIAL",
      email: "guest_abc@guest.studyos.app",
      name: null,
    });
    activeBillingProvider.mockReturnValue("polar");
    polarProductIdForPlan.mockReturnValue("product_pro");
    createPolarCheckoutSession.mockResolvedValue({
      url: "https://sandbox-api.polar.sh/checkout/xyz",
    });

    const result = await startCheckout("PRO");

    expect(result.ok).toBe(true);
    expect(createPolarCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerEmail: null, externalCustomerId: "user-guest" }),
    );
  });

  it("does not fire checkout_started when the Polar session creation failed (no false funnel credit)", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
      name: null,
    });
    activeBillingProvider.mockReturnValue("polar");
    polarProductIdForPlan.mockReturnValue("product_pro");
    createPolarCheckoutSession.mockRejectedValue(new Error("polar down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await startCheckout("PRO");

    errorSpy.mockRestore();
    expect(result.ok).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });
});
