import { describe, expect, it } from "vitest";
import { getActiveThemeEvent, getScheduledThemeEvent, isThemeEventActive, THEME_EVENTS, type ThemeEvent } from "./theme-event";

const event: ThemeEvent = {
  id: "test",
  name: "Test",
  startsAt: new Date("2026-09-27T00:00:00Z"),
  endsAt: new Date("2026-10-04T00:00:00Z"),
  theme: "midnight",
  copy: "Test event",
  enabled: true,
  missions: [],
  action: { label: "Start", href: "/problems" },
};

describe("theme event window", () => {
  it("is inactive before start, active at start and until the exclusive end", () => {
    expect(isThemeEventActive(event, new Date("2026-09-26T23:59:59Z"))).toBe(false);
    expect(isThemeEventActive(event, event.startsAt)).toBe(true);
    expect(isThemeEventActive(event, new Date("2026-10-03T23:59:59Z"))).toBe(true);
    expect(isThemeEventActive(event, event.endsAt)).toBe(false);
  });

  it("disables an event even inside its date range", () => {
    expect(isThemeEventActive({ ...event, enabled: false }, event.startsAt)).toBe(false);
  });

  it("defines the launch event as exactly seven days", () => {
    const launchEvent = getActiveThemeEvent(new Date("2026-09-27T00:00:00Z"));
    expect(launchEvent?.id).toBe("midnight-study-week");
    expect(launchEvent!.endsAt.getTime() - launchEvent!.startsAt.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(launchEvent!.startsAt.toISOString()).toBe("2026-09-26T23:59:58.000Z");
    expect(launchEvent!.endsAt.toISOString()).toBe("2026-10-03T23:59:58.000Z");
  });

  it("keeps the scheduled event inactive before its fixed start and after its end", () => {
    const [launchEvent] = THEME_EVENTS;
    expect(getActiveThemeEvent(new Date("2026-09-26T23:59:57.999Z"))).toBeNull();
    expect(getActiveThemeEvent(new Date("2026-10-03T23:59:58.000Z"))).toBeNull();
    expect(launchEvent?.action.href).toBe("/problems");
  });

  it("selects a future event for static landing markup without activating it early", () => {
    expect(getScheduledThemeEvent(new Date("2026-09-26T23:59:57.999Z"))?.id).toBe(
      "midnight-study-week",
    );
    expect(getActiveThemeEvent(new Date("2026-09-26T23:59:57.999Z"))).toBeNull();
    expect(getScheduledThemeEvent(event.endsAt)).toBeNull();
  });
});
