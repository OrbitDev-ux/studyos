import { describe, expect, it } from "vitest";
import { devSettingsSchema, parseDevSettings } from "@/features/dev/schema";
import { DEFAULT_DEV_SETTINGS } from "@/features/dev/config";

describe("devSettingsSchema — whitelist (§31)", () => {
  it("accepts a valid partial settings payload", () => {
    const parsed = devSettingsSchema.safeParse({ terminalFontSize: 16, wordWrap: false });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty payload (no-op update)", () => {
    expect(devSettingsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects any key outside the whitelist — no arbitrary container config", () => {
    expect(
      devSettingsSchema.safeParse({ terminalFontSize: 14, containerImage: "evil/image:latest" })
        .success,
    ).toBe(false);
    expect(devSettingsSchema.safeParse({ dockerSocket: "/var/run/docker.sock" }).success).toBe(
      false,
    );
  });

  it("rejects out-of-range numeric values", () => {
    expect(devSettingsSchema.safeParse({ terminalFontSize: 999 }).success).toBe(false);
    expect(devSettingsSchema.safeParse({ terminalFontSize: 0 }).success).toBe(false);
    expect(devSettingsSchema.safeParse({ idleTimeoutMinutes: 100000 }).success).toBe(false);
  });

  it("rejects values outside the enum whitelist", () => {
    expect(devSettingsSchema.safeParse({ terminalTheme: "matrix-green" }).success).toBe(false);
    expect(devSettingsSchema.safeParse({ shell: "zsh" }).success).toBe(false); // not offered in v1
  });
});

describe("parseDevSettings", () => {
  it("falls back to defaults for null/invalid input", () => {
    expect(parseDevSettings(null)).toEqual(DEFAULT_DEV_SETTINGS);
    expect(parseDevSettings({ containerImage: "evil" })).toEqual(DEFAULT_DEV_SETTINGS);
  });

  it("merges valid stored values over the defaults", () => {
    expect(parseDevSettings({ terminalFontSize: 18, wordWrap: false })).toEqual({
      ...DEFAULT_DEV_SETTINGS,
      terminalFontSize: 18,
      wordWrap: false,
    });
  });
});
