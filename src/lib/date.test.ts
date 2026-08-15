import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "@/lib/date";

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
    const result = formatRelativeTime(new Date(NOW.getTime() - 3 * 3_600_000), "en-US", NOW);
    expect(result).toMatch(/3 hours ago/);
  });

  it("renders days for a gap under a month", () => {
    const result = formatRelativeTime(new Date(NOW.getTime() - 2 * 86_400_000), "en-US", NOW);
    expect(result).toMatch(/2 days ago/);
  });

  it("falls back to an absolute short date once a year or more has passed", () => {
    const yearAgo = new Date(NOW.getTime() - 400 * 86_400_000);
    const result = formatRelativeTime(yearAgo, "en-US", NOW);
    expect(result).not.toMatch(/ago/);
  });

  it("renders in Korean for the ko-KR locale", () => {
    const result = formatRelativeTime(new Date(NOW.getTime() - 10 * 60_000), "ko-KR", NOW);
    expect(result).toContain("분");
  });
});
