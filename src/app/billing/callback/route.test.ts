import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /billing/callback — browser-return security seams:
 *  - Polar branch is banner-only (grant happens on the signed webhook); a
 *    checkout whose metadata.userId belongs to someone else shows fail and
 *    MUST never touch applyPaymentEvent.
 *  - Capture failures degrade to a fail banner (never a misleading success).
 *  - Toss branch rejects a customerKey that isn't the signed-in user before
 *    even attempting issueBillingKey.
 */
vi.mock("server-only", () => ({}));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { getPolarCheckout } = vi.hoisted(() => ({ getPolarCheckout: vi.fn() }));
vi.mock("@/features/billing/polar-client", () => ({ getPolarCheckout }));

const { applyPaymentEvent } = vi.hoisted(() => ({ applyPaymentEvent: vi.fn() }));
vi.mock("@/features/billing/payment-service", () => ({ applyPaymentEvent }));

const {
  issueBillingKey,
  chargeBillingKey,
  deleteBillingKey,
} = vi.hoisted(() => ({
  issueBillingKey: vi.fn(),
  chargeBillingKey: vi.fn(),
  deleteBillingKey: vi.fn(),
}));
vi.mock("@/features/billing/toss-client", () => ({
  issueBillingKey,
  chargeBillingKey,
  deleteBillingKey,
}));

import { GET } from "@/app/billing/callback/route";

function get(url: string) {
  return GET({ url } as unknown as Parameters<typeof GET>[0]);
}

function bannerToss(result: Response): string {
  return new URL(result.headers.get("location") ?? "").searchParams.get("billing") ?? "none";
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue({ id: "user-1", plan: "TRIAL", email: "a@test.com", name: null });
});

describe("Polar checkout branch (banner only — grant lives in the webhook)", () => {
  it("shows fail and never grants when the checkout belongs to a DIFFERENT user", async () => {
    getPolarCheckout.mockResolvedValue({
      status: "succeeded",
      metadata: { userId: "user-other", plan: "PRO" },
    });

    const res = await get("http://localhost/billing/callback?plan=PRO&checkout_id=c_1");

    expect(bannerToss(res)).toBe("fail");
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("shows success only when the checkout is paid AND owned by the caller", async () => {
    getPolarCheckout.mockResolvedValue({
      status: "confirmed",
      metadata: { userId: "user-1", plan: "PRO" },
    });

    const res = await get("http://localhost/billing/callback?plan=PRO&checkout_id=c_1");

    expect(bannerToss(res)).toBe("success");
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("degrades to fail when the checkout lookup itself throws", async () => {
    getPolarCheckout.mockRejectedValue(new Error("polar down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await get("http://localhost/billing/callback?plan=PRO&checkout_id=c_1");

    errorSpy.mockRestore();
    expect(bannerToss(res)).toBe("fail");
  });
});

describe("Toss branch", () => {
  it("rejects a customerKey that isn't the signed-in user before any billing call", async () => {
    const res = await get(
      "http://localhost/billing/callback?plan=PRO&authKey=auth-1&customerKey=hacker-id",
    );

    expect(bannerToss(res)).toBe("fail");
    expect(issueBillingKey).not.toHaveBeenCalled();
    expect(chargeBillingKey).not.toHaveBeenCalled();
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("issues the key and charges the server-side amount for a matching customerKey", async () => {
    issueBillingKey.mockResolvedValue({ billingKey: "bk_1" });
    chargeBillingKey.mockResolvedValue({
      status: "DONE",
      totalAmount: 4900,
      paymentKey: "pay-k",
      approvedAt: "2026-09-21T00:00:00Z",
    });

    const res = await get(
      "http://localhost/billing/callback?plan=PRO&authKey=auth-1&customerKey=user-1",
    );

    expect(bannerToss(res)).toBe("success");
    expect(issueBillingKey).toHaveBeenCalledWith({ authKey: "auth-1", customerKey: "user-1" });
    expect(chargeBillingKey).toHaveBeenCalled();
    expect(applyPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        amount: 4900,
        plan: "PRO",
        provider: "toss",
        status: "SUCCEEDED",
      }),
    );
  });
});