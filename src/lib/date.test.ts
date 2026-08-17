import { describe, expect, it } from "vitest";
import { formatRelativeTime, getLastNDateStrings } from "@/lib/date";

const NOW = new Date("2026-08-15T12:00:00Z");

describe("formatRelativeTime", () => {
  it("renders 'just now' for anything under 5 seconds old", () => {
    const result = formatRelativeTime(new Date(NOW.getTime() - 2_000), "en-US", NOW);
    expect(result).toMatch(/now/i);
  });

  it("renders minutes for a gap under an hour", () => {
    const result = formatRelativeTime(new Date(NOW.getTime() - 5 * 60_000), "en-US", NOW);
    expect(result).toMatch(/5 minutes ago/);
  });

  it("renders hours for a gap under a day", () => {
    const result = formatRelativeTime(
      new Date(NOW.getTime() - 3 * 3_600_000),
      "en-US",
      NOW,
    );
    expect(result).toMatch(/3 hours ago/);
  });

  it("renders days for a gap under a month", () => {
    const result = formatRelativeTime(
      new Date(NOW.getTime() - 2 * 86_400_000),
      "en-US",
      NOW,
    );
    expect(result).toMatch(/2 days ago/);
  });

  it("falls back to an absolute short date once a year or more has passed", () => {
    const yearAgo = new Date(NOW.getTime() - 400 * 86_400_000);
    const result = formatRelativeTime(yearAgo, "en-US", NOW);
    expect(result).not.toMatch(/ago/);
  });

  it("renders in Korean for the ko-KR locale", () => {
    const result = formatRelativeTime(
      new Date(NOW.getTime() - 10 * 60_000),
      "ko-KR",
      NOW,
    );
    expect(result).toContain("분");
  });
});

describe("getLastNDateStrings", () => {
  it("returns 7 ascending dates ending today for a 7-day window", () => {
    const result = getLastNDateStrings("Asia/Seoul", 7, NOW);
    // NOW is 2026-08-15T12:00:00Z → 2026-08-15 21:00 KST → today is 08-15.
    expect(result).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("returns exactly `days` entries with no duplicates", () => {
    const result = getLastNDateStrings("Asia/Seoul", 30, NOW);
    expect(result).toHaveLength(30);
    expect(new Set(result).size).toBe(30);
  });

  it("crosses a month boundary correctly", () => {
    const marchFirst = new Date("2026-03-01T12:00:00Z");
    const result = getLastNDateStrings("Asia/Seoul", 3, marchFirst);
    expect(result).toEqual(["2026-02-27", "2026-02-28", "2026-03-01"]);
  });

  it("respects a timezone behind UTC (date can differ from UTC date)", () => {
    // 2026-08-15T02:00:00Z → 2026-08-14 19:00 in America/New_York (UTC-5).
    const earlyUtc = new Date("2026-08-15T02:00:00Z");
    const result = getLastNDateStrings("America/New_York", 1, earlyUtc);
    expect(result).toEqual(["2026-08-14"]);
  });
});
