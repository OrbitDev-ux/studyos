import { describe, expect, it } from "vitest";
import { formatDuration } from "@/lib/format";

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
