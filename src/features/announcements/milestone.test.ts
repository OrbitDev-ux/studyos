import { describe, expect, it } from "vitest";
import { MILESTONE_BANNER } from "@/config/site";
import { isMilestoneBannerActive } from "@/features/announcements/milestone";

// Window is derived from config: [launchDate, launchDate + milestoneWeeks*7 + windowDays) KST.
const launch = new Date(`${MILESTONE_BANNER.launchDate}T00:00:00+09:00`);
const totalDays = MILESTONE_BANNER.milestoneWeeks * 7 + MILESTONE_BANNER.windowDays;
const day = 24 * 60 * 60 * 1000;

describe("isMilestoneBannerActive — real-date-driven, auto-expiring", () => {
  it("is hidden before the launch date", () => {
    expect(isMilestoneBannerActive(new Date(launch.getTime() - day))).toBe(false);
  });

  it("is shown at launch and inside the window (e.g. around the 1주 mark)", () => {
    expect(isMilestoneBannerActive(launch)).toBe(true);
    expect(isMilestoneBannerActive(new Date(launch.getTime() + 7 * day))).toBe(true);
    expect(isMilestoneBannerActive(new Date(launch.getTime() + (totalDays - 1) * day))).toBe(true);
  });

  it("auto-expires once the window has fully passed (not permanent)", () => {
    expect(isMilestoneBannerActive(new Date(launch.getTime() + totalDays * day))).toBe(false);
    expect(isMilestoneBannerActive(new Date(launch.getTime() + 365 * day))).toBe(false);
  });
});
