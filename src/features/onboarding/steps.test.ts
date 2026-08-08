import { describe, expect, it } from "vitest";
import { GUEST_STEPS, LOGGED_IN_STEPS, stepsFor } from "@/features/onboarding/steps";

describe("onboarding steps", () => {
  it("guest flow is shorter than the full flow", () => {
    expect(GUEST_STEPS.length).toBeGreaterThan(0);
    expect(GUEST_STEPS.length).toBeLessThan(LOGGED_IN_STEPS.length);
  });

  it("stepsFor picks the flow by guest flag", () => {
    expect(stepsFor(true)).toBe(GUEST_STEPS);
    expect(stepsFor(false)).toBe(LOGGED_IN_STEPS);
  });

  it("every step has a title and body; step ids are unique per flow", () => {
    for (const flow of [GUEST_STEPS, LOGGED_IN_STEPS]) {
      for (const step of flow) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(0);
      }
      const ids = flow.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("logged-in flow walks the real learning loop and ends with a start CTA", () => {
    const targets = LOGGED_IN_STEPS.map((s) => s.target);
    // Highlights the real dashboard anchors (data-tour ids).
    expect(targets).toContain("daily-mission");
    expect(targets).toContain("weakness");
    expect(targets).toContain("today-review");

    const last = LOGGED_IN_STEPS.at(-1)!;
    expect(last.cta?.href).toBe("/problems");
  });

  it("guest flow ends by inviting sign-up", () => {
    const last = GUEST_STEPS.at(-1)!;
    expect(last.cta?.href).toBe("/signup");
  });
});
