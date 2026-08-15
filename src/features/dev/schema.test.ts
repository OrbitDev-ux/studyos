import { describe, expect, it } from "vitest";
import {
  createWorkspaceSchema,
  devSettingsSchema,
  parseDevSettings,
  workspaceNameSchema,
} from "@/features/dev/schema";
import { DEFAULT_DEV_SETTINGS } from "@/features/dev/config";

describe("workspaceNameSchema", () => {
  it("accepts safe names", () => {
    expect(workspaceNameSchema.safeParse("my-project").success).toBe(true);
    expect(workspaceNameSchema.safeParse("project_2").success).toBe(true);
    expect(workspaceNameSchema.safeParse("a").success).toBe(true);
  });

  it("rejects empty / too-long names", () => {
    expect(workspaceNameSchema.safeParse("").success).toBe(false);
    expect(workspaceNameSchema.safeParse("x".repeat(51)).success).toBe(false);
  });

  it("rejects shell/path metacharacters — never becomes a filesystem/shell token", () => {
    for (const bad of ["../escape", "/etc/passwd", "rm -rf /", "a;b", "a$(whoami)", "a`whoami`", "a|b", "a&b"]) {
      expect(workspaceNameSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it("must start with an alphanumeric character", () => {
    expect(workspaceNameSchema.safeParse("-project").success).toBe(false);
    expect(workspaceNameSchema.safeParse(".hidden").success).toBe(false);
  });
});

describe("createWorkspaceSchema", () => {
  it("name is optional (defaults applied by the action)", () => {
    expect(createWorkspaceSchema.safeParse({}).success).toBe(true);
    expect(createWorkspaceSchema.safeParse({ name: "my-project" }).success).toBe(true);
  });
});

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
