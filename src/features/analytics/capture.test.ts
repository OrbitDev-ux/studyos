import { describe, expect, it, vi } from "vitest";

/**
 * Analytics SLA smoke checks (src/features/analytics). The real guarantee is
 * compile-time (events.ts's discriminated union rejects bad names/props), so
 * at runtime all we promise is: capture() never throws and, in dev, writes a
 * visible line per event. That "never throw" contract keeps events safe to
 * fire from inside billing transactions and cron jobs.
 */
vi.mock("server-only", () => ({}));

import { EVENT_DESCRIPTIONS, type AnalyticsEvent } from "@/features/analytics/events";
import { capture } from "@/features/analytics/capture";

const SAMPLE_EVENTS: AnalyticsEvent[] = [
  { name: "signup_completed", props: { method: "email" } },
  { name: "login_completed", props: { method: "google" } },
  { name: "problems_generated", props: { count: 3, subject: "수학", type: "MULTIPLE_CHOICE" } },
  { name: "demo_started", props: {} },
  { name: "study_session_completed", props: { durationSec: 1800 } },
  { name: "charge_succeeded", props: { plan: "PRO", amount: 9900, currency: "KRW", provider: "polar" } },
  { name: "subscription_canceled", props: { plan: "PRO", atPeriodEnd: true } },
  { name: "subscription_expired", props: { plan: "PRO", reason: "grace" } },
  { name: "checkout_started", props: { plan: "PRO", provider: "polar" } },
  { name: "pricing_viewed", props: {} },
];

describe("capture (server event sink)", () => {
  it("fires every catalog event without throwing, logging a dev line", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    for (const event of SAMPLE_EVENTS) {
      expect(() => capture(event)).not.toThrow();
    }

    expect(info).toHaveBeenCalledTimes(SAMPLE_EVENTS.length);
    expect(info).toHaveBeenCalledWith("[analytics] signup_completed", JSON.stringify({ method: "email" }));
    info.mockRestore();
  });

  it("swallows its own failures instead of breaking the caller", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {
      throw new Error("sink failure");
    });

    expect(() => capture({ name: "demo_started", props: {} })).not.toThrow();
    info.mockRestore();
  });
});

describe("event catalog", () => {
  it("documents every event in EVENT_DESCRIPTIONS (lockstep with the union)", () => {
    const names = new Set(SAMPLE_EVENTS.map((e) => e.name));
    for (const name of names) {
      expect(EVENT_DESCRIPTIONS[name]).toEqual(expect.any(String));
    }
    expect(Object.keys(EVENT_DESCRIPTIONS)).toHaveLength(names.size);
  });
});
