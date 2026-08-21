import { describe, expect, it } from "vitest";
import { getTimeOfDay, selectLoginMessage } from "@/features/login-experience/select";

/**
 * select.ts had zero test coverage despite non-trivial stateful logic
 * (weighted rarity roll with graceful downgrade, role/time eligibility
 * filtering, override priority tie-break, seasonal-event date gating) — all
 * flagged in the codebase audit. `rng` is injectable specifically so this
 * doesn't need to touch Math.random.
 */

// A Wednesday, safely outside both seasonal-event windows (event-newyear is
// Jan 1, event-christmas is Dec 25).
const AFTERNOON = new Date(2026, 5, 10, 14, 0);
const LATE_NIGHT = new Date(2026, 5, 10, 2, 0);
const NEW_YEARS_DAY_LATE_NIGHT = new Date(2026, 0, 1, 2, 0);

describe("getTimeOfDay", () => {
  it.each([
    [0, "lateNight"],
    [4, "lateNight"],
    [5, "morning"],
    [11, "morning"],
    [12, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [23, "evening"],
  ] as const)("hour %i -> %s", (hour, expected) => {
    const date = new Date(2026, 5, 10, hour);
    expect(getTimeOfDay(date)).toBe(expected);
  });
});

describe("selectLoginMessage — role isolation", () => {
  it("never returns an admin-only message for role 'user', across the full rarity-roll range", () => {
    for (let i = 0; i < 200; i++) {
      const rng = () => i / 200;
      const result = selectLoginMessage({ role: "user", date: AFTERNOON }, rng);
      expect(result.roles === undefined || result.roles.includes("user")).toBe(true);
    }
  });

  it("never returns a user-only message for role 'admin', across the full rarity-roll range", () => {
    for (let i = 0; i < 200; i++) {
      const rng = () => i / 200;
      const result = selectLoginMessage({ role: "admin", date: AFTERNOON }, rng);
      expect(result.roles === undefined || result.roles.includes("admin")).toBe(true);
    }
  });
});

describe("selectLoginMessage — graceful rarity downgrade", () => {
  it("downgrades a legendary/epic roll to 'rare' for role 'user', which has no epic/legendary pool", () => {
    // rng() * 100 < 0.1 -> rolls legendary.
    const result = selectLoginMessage({ role: "user", date: AFTERNOON }, () => 0);
    expect(result.id).toBe("u-coffee"); // the only user-eligible rare message
    expect(result.rarity).toBe("rare");
  });

  it("resolves a legendary roll for role 'admin' to the one legendary admin message", () => {
    const result = selectLoginMessage({ role: "admin", date: AFTERNOON }, () => 0);
    expect(result.id).toBe("a-founder");
    expect(result.rarity).toBe("legendary");
  });
});

describe("selectLoginMessage — overrides", () => {
  it("takes the Late Night Coding override for an admin logging in between 00:00-04:59", () => {
    // rng tuned toward "common" so the override must be what wins, not a rarity coincidence.
    const result = selectLoginMessage({ role: "admin", date: LATE_NIGHT }, () => 0.99);
    expect(result.id).toBe("late-night-coding");
  });

  it("prefers the higher-priority seasonal-event override over the lower-priority late-night override when both are eligible", () => {
    const result = selectLoginMessage(
      { role: "admin", date: NEW_YEARS_DAY_LATE_NIGHT },
      () => 0.99,
    );
    expect(result.id).toBe("event-newyear"); // priority 20 > late-night-coding's 10
  });

  it("does not take the seasonal-event override on an ordinary day", () => {
    const result = selectLoginMessage({ role: "admin", date: AFTERNOON }, () => 0.99);
    expect(result.id).not.toBe("event-newyear");
    expect(result.id).not.toBe("event-christmas");
  });
});
