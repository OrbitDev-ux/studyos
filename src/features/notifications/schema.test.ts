import { describe, expect, it } from "vitest";
import { parseNotificationPreferences } from "@/features/notifications/schema";

describe("parseNotificationPreferences", () => {
  it("returns empty object for null/undefined (never trusts a missing column)", () => {
    expect(parseNotificationPreferences(null)).toEqual({});
    expect(parseNotificationPreferences(undefined)).toEqual({});
  });

  it("accepts a well-formed subset of known categories", () => {
    expect(parseNotificationPreferences({ dm: false, friend: true })).toEqual({
      dm: false,
      friend: true,
    });
  });

  it("drops unknown keys instead of persisting them (.strict())", () => {
    expect(parseNotificationPreferences({ dm: false, notARealCategory: true })).toEqual({});
  });

  it("rejects non-boolean values for a known category", () => {
    expect(parseNotificationPreferences({ dm: "off" })).toEqual({});
  });

  it("rejects a non-object payload entirely", () => {
    expect(parseNotificationPreferences("dm")).toEqual({});
    expect(parseNotificationPreferences(42)).toEqual({});
  });
});
