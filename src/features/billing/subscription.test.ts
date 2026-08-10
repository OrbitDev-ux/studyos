import { describe, expect, it } from "vitest";
import {
  effectivePlan,
  effectiveStatus,
  isTrialExpired,
  resolveAccessState,
  resolveTrialEndsAt,
  trialDaysRemaining,
  type SubscriptionInput,
} from "@/features/billing/subscription";

const NOW = new Date("2026-08-09T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function trial(overrides: Partial<SubscriptionInput> = {}): SubscriptionInput {
  return {
    plan: "TRIAL",
    trialStartedAt: new Date(NOW.getTime() - 2 * DAY),
    trialEndsAt: new Date(NOW.getTime() + 5 * DAY),
    ...overrides,
  };
}

describe("subscription — trial resolution", () => {
  it("resolves access state from plan + trial expiry", () => {
    expect(resolveAccessState(trial(), NOW)).toBe("TRIAL");
    expect(
      resolveAccessState(trial({ trialEndsAt: new Date(NOW.getTime() - DAY) }), NOW),
    ).toBe("TRIAL_EXPIRED");
    expect(resolveAccessState({ ...trial(), plan: "PRO" }, NOW)).toBe("PRO");
    expect(resolveAccessState({ ...trial(), plan: "PREMIUM" }, NOW)).toBe("PREMIUM");
  });

  it("isTrialExpired only for past-due trials", () => {
    expect(isTrialExpired(trial(), NOW)).toBe(false);
    expect(isTrialExpired(trial({ trialEndsAt: new Date(NOW.getTime() - DAY) }), NOW)).toBe(true);
    // Paid plans are never expired.
    expect(
      isTrialExpired(
        { plan: "PRO", trialStartedAt: null, trialEndsAt: new Date(NOW.getTime() - DAY) },
        NOW,
      ),
    ).toBe(false);
  });

  it("derives trialEndsAt from start + 7 days when not stored", () => {
    const start = new Date(NOW.getTime() - DAY);
    const end = resolveTrialEndsAt({ plan: "TRIAL", trialStartedAt: start, trialEndsAt: null });
    expect(end?.getTime()).toBe(start.getTime() + 7 * DAY);
  });

  it("counts whole days remaining, 0 past end, null when not trial", () => {
    expect(trialDaysRemaining(trial(), NOW)).toBe(5);
    expect(
      trialDaysRemaining(trial({ trialEndsAt: new Date(NOW.getTime() - DAY) }), NOW),
    ).toBe(0);
    expect(trialDaysRemaining({ ...trial(), plan: "PRO" }, NOW)).toBeNull();
  });

  it("effective status is computed, not just stored", () => {
    expect(effectiveStatus(trial(), NOW)).toBe("TRIALING");
    expect(
      effectiveStatus(trial({ trialEndsAt: new Date(NOW.getTime() - DAY) }), NOW),
    ).toBe("EXPIRED");
    expect(effectiveStatus({ ...trial(), plan: "PRO" }, NOW)).toBe("ACTIVE");
  });

  it("accepts ISO string dates (as Supabase returns them)", () => {
    const input: SubscriptionInput = {
      plan: "TRIAL",
      trialStartedAt: "2026-08-07T00:00:00.000Z",
      trialEndsAt: "2026-08-14T00:00:00.000Z",
    };
    expect(resolveAccessState(input, NOW)).toBe("TRIAL");
    expect(trialDaysRemaining(input, NOW)).toBe(5);
  });
});

describe("subscription — admin plan override", () => {
  it("uses the override plan for entitlement resolution only when enabled", () => {
    // Real TRIAL + Override PREMIUM → PREMIUM
    expect(
      resolveAccessState(
        trial({ adminPlanOverride: "PREMIUM", adminPlanOverrideEnabled: true }),
        NOW,
      ),
    ).toBe("PREMIUM");
    // Real PRO + Override TRIAL → TRIAL (trial dates still active)
    expect(
      resolveAccessState(
        { ...trial(), plan: "PRO", adminPlanOverride: "TRIAL", adminPlanOverrideEnabled: true },
        NOW,
      ),
    ).toBe("TRIAL");
    // Real PREMIUM + Override OFF → PREMIUM (real plan)
    expect(
      resolveAccessState(
        { ...trial(), plan: "PREMIUM", adminPlanOverride: "TRIAL", adminPlanOverrideEnabled: false },
        NOW,
      ),
    ).toBe("PREMIUM");
    // TRIAL → PRO / PRO → PREMIUM
    expect(
      resolveAccessState(
        trial({ adminPlanOverride: "PRO", adminPlanOverrideEnabled: true }),
        NOW,
      ),
    ).toBe("PRO");
  });

  it("an enabled TRIAL override still honors trial expiry", () => {
    // Real PRO overridden to TRIAL, but the trial window is past → TRIAL_EXPIRED
    expect(
      resolveAccessState(
        {
          plan: "PRO",
          trialStartedAt: new Date(NOW.getTime() - 10 * DAY),
          trialEndsAt: new Date(NOW.getTime() - DAY),
          adminPlanOverride: "TRIAL",
          adminPlanOverrideEnabled: true,
        },
        NOW,
      ),
    ).toBe("TRIAL_EXPIRED");
  });

  it("effectivePlan reflects the override flag; missing fields = real plan", () => {
    expect(effectivePlan(trial())).toBe("TRIAL");
    expect(
      effectivePlan(trial({ adminPlanOverride: "PREMIUM", adminPlanOverrideEnabled: true })),
    ).toBe("PREMIUM");
    // enabled but no plan set → falls back to real plan
    expect(effectivePlan(trial({ adminPlanOverrideEnabled: true }))).toBe("TRIAL");
    // plan set but disabled → real plan
    expect(
      effectivePlan(trial({ adminPlanOverride: "PREMIUM", adminPlanOverrideEnabled: false })),
    ).toBe("TRIAL");
  });

  it("does NOT change the real billing lifecycle status (effectiveStatus)", () => {
    // Override to PREMIUM but real plan is TRIAL → status still TRIALING
    // (billing/subscription data is untouched by the override).
    expect(
      effectiveStatus(
        trial({ adminPlanOverride: "PREMIUM", adminPlanOverrideEnabled: true }),
        NOW,
      ),
    ).toBe("TRIALING");
  });
});
