import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/billing/polar-client", () => ({ isPolarConfigured: () => true }));
vi.mock("@/features/billing/toss-client", () => ({ isTossConfigured: () => true }));

import { activeBillingProvider, isBillingConfigured, isCheckoutUsable } from "./providers";

describe("FREE_ONLY billing policy", () => {
  it("keeps configured historical providers inactive for new sales", () => {
    expect(activeBillingProvider()).toBeNull();
    expect(isBillingConfigured()).toBe(false);
    expect(isCheckoutUsable()).toBe(false);
  });
});
