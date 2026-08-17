import { describe, expect, it } from "vitest";
import { formatDuration, formatFileSize } from "@/lib/format";

describe("formatDuration", () => {
  const cases = {
    "ko-KR": { hm: "3시간 20분", m: "20분", h: "3시간", zero: "0분" },
    "en-US": { hm: "3h 20m", m: "20m", h: "3h", zero: "0m" },
    "ja-JP": { hm: "3時間20分", m: "20分", h: "3時間", zero: "0分" },
    "zh-CN": { hm: "3小时20分钟", m: "20分钟", h: "3小时", zero: "0分钟" },
  } as const;

  for (const [locale, expected] of Object.entries(cases)) {
    it(`formats each part in ${locale}`, () => {
      const loc = locale as keyof typeof cases;
      expect(formatDuration(3 * 3600 + 20 * 60, loc)).toBe(expected.hm);
      expect(formatDuration(20 * 60, loc)).toBe(expected.m);
      expect(formatDuration(3 * 3600, loc)).toBe(expected.h);
      expect(formatDuration(0, loc)).toBe(expected.zero);
    });
  }

  it("floors partial minutes", () => {
    expect(formatDuration(59, "en-US")).toBe("0m");
    expect(formatDuration(90, "en-US")).toBe("1m");
  });
});

describe("formatFileSize", () => {
  it("renders bytes under 1 KB as-is", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("renders kilobytes with one decimal under 10 KB", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("renders kilobytes with no decimal at or above 10 KB", () => {
    expect(formatFileSize(15 * 1024)).toBe("15 KB");
  });

  it("renders megabytes with one decimal under 10 MB", () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("renders megabytes with no decimal at or above 10 MB", () => {
    expect(formatFileSize(12 * 1024 * 1024)).toBe("12 MB");
  });
});
