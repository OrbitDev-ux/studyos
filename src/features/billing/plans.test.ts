import { describe, expect, it } from "vitest";

/**
 * Canonical pricing metadata (§14 regression): PRO is the only for-sale plan
 * at $9.99 USD / month; PREMIUM is not-for-sale but its historical identity
 * (priceMinor/priceKrw/entitlement wiring) is preserved.
 */
import { PLANS, PLAN_META, isPlanForSale } from "@/features/billing/plans";

describe("PLAN_META — canonical pricing ($9.99 launch decision)", () => {
  it("PRO is $9.99 USD / month (minor units + display label)", () => {
    const pro = PLAN_META.PRO;
    expect(pro.priceMinor).toBe(999);
    expect(pro.currency).toBe("USD");
    expect(pro.priceLabel).toBe("$9.99 USD / 월");
    expect(isPlanForSale("PRO")).toBe(true);
  });

  it("PREMIUM is explicit NOT_FOR_SALE while keeping its historical price identity", () => {
    const premium = PLAN_META.PREMIUM;
    expect(premium.notForSale).toBe(true);
    expect(isPlanForSale("PREMIUM")).toBe(false);
    // Historical identity stays for existing subscribers / migrations — never
    // sold through the current catalog, never displayed as a current price.
    expect(premium.priceMinor).toBe(9900);
    expect(premium.currency).toBe("KRW");
    expect(premium.priceKrw).toBe(9900);
  });

  it("TRIAL stays free and for-sale surfaces exclude it from paid CTAs", () => {
    expect(PLAN_META.TRIAL.priceMinor).toBe(0);
    expect(isPlanForSale("TRIAL")).toBe(true);
  });

  it("keeps the legacy KRW rail amount distinct from the current PRO sale price", () => {
    // priceKrw is the retired Toss billing-key rail amount, NOT the catalog
    // price (which is priceMinor + currency = $9.99 USD).
    expect(PLAN_META.PRO.priceKrw).toBe(4900);
    expect(PLAN_META.PRO.priceMinor).not.toBe(PLAN_META.PRO.priceKrw);
  });

  it("every plan key is covered by PLAN_META (TRIAL < PRO < PREMIUM order intact)", () => {
    expect(Object.keys(PLAN_META).sort()).toEqual([...PLANS].sort());
    expect(PLAN_META.TRIAL.order).toBeLessThan(PLAN_META.PRO.order);
    expect(PLAN_META.PRO.order).toBeLessThan(PLAN_META.PREMIUM.order);
  });
});
