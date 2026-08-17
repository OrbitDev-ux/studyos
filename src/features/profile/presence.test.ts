import { describe, expect, it } from "vitest";
import { deriveOnlineStatus } from "@/features/profile/presence";

const NOW = Date.parse("2026-08-17T12:00:00Z");

describe("deriveOnlineStatus", () => {
  it("is OFFLINE when there is no heartbeat at all", () => {
    expect(deriveOnlineStatus(null, NOW)).toBe("OFFLINE");
    expect(deriveOnlineStatus(undefined, NOW)).toBe("OFFLINE");
  });

  it("is OFFLINE for an unparseable timestamp", () => {
    expect(deriveOnlineStatus("not-a-date", NOW)).toBe("OFFLINE");
  });

  it("is ONLINE just after a heartbeat", () => {
    expect(deriveOnlineStatus(new Date(NOW - 1_000), NOW)).toBe("ONLINE");
  });

  it("is ONLINE right up to the online window boundary", () => {
    expect(deriveOnlineStatus(new Date(NOW - 179_000), NOW)).toBe("ONLINE");
  });

  it("is IDLE once the online window has passed", () => {
    expect(deriveOnlineStatus(new Date(NOW - 181_000), NOW)).toBe("IDLE");
  });

  it("is IDLE right up to the idle window boundary", () => {
    expect(deriveOnlineStatus(new Date(NOW - 599_000), NOW)).toBe("IDLE");
  });

  it("is OFFLINE once the idle window has passed", () => {
    expect(deriveOnlineStatus(new Date(NOW - 601_000), NOW)).toBe("OFFLINE");
  });

  it("accepts an ISO string the same way it accepts a Date", () => {
    const iso = new Date(NOW - 1_000).toISOString();
    expect(deriveOnlineStatus(iso, NOW)).toBe("ONLINE");
  });
});
