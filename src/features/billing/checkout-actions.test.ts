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
vi.mock("@/features/billing/providers", () => ({ activeBillingProvider, FREE_ONLY_MODE: true }));

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
  it("disables new billing setup for any authenticated plan request", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
    });

    const result = await getBillingAuthConfig("PRO");

    expect(result).toEqual({
      ok: false,
      error: "StudyOS에서는 새 결제를 받지 않습니다.",
    });
    expect(isTossConfigured).not.toHaveBeenCalled();
  });

  it("does not reveal plan setup for a not-for-sale historical plan", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });
    await expect(getBillingAuthConfig("PREMIUM")).resolves.toEqual({
      ok: false,
      error: "StudyOS에서는 새 결제를 받지 않습니다.",
    });
  });

  it("does not attempt provider setup for an invalid plan string", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });
    const result = await getBillingAuthConfig("GOLD");
    expect(result.ok).toBe(false);
    expect(isTossConfigured).not.toHaveBeenCalled();
  });
});

describe("startCheckout", () => {
  it("fails closed for PRO and does not call a provider", async () => {
    requireCurrentUser.mockResolvedValue({
      id: "user-1",
      plan: "TRIAL",
      email: "a@test.com",
      name: null,
    });

    const result = await startCheckout("PRO");

    expect(result).toEqual({
      ok: false,
      error: "StudyOS에서는 새 결제를 받지 않습니다.",
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

  it("does not open checkout for any plan in free-only mode", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });
    const result = await startCheckout("PREMIUM");
    expect(capture).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: "StudyOS에서는 새 결제를 받지 않습니다." });
    expect(createPolarCheckoutSession).not.toHaveBeenCalled();
  });

  it("keeps even configured Polar from creating a new checkout", async () => {
    requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com" });
    activeBillingProvider.mockReturnValue("polar");
    await startCheckout("PRO");
    expect(activeBillingProvider).not.toHaveBeenCalled();
    expect(createPolarCheckoutSession).not.toHaveBeenCalled();
  });

  it("still requires an authenticated caller", async () => {
    requireCurrentUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(startCheckout("PRO")).rejects.toThrow("NEXT_REDIRECT");
  });
});
