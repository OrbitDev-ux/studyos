import { MILESTONE_BANNER } from "@/config/site";

/** sessionStorage key — dismissing the banner hides it for the rest of the
 * session (survives refresh in the same tab; a new session shows it again). */
export const MILESTONE_DISMISS_KEY = "studyos.milestone.1w.dismissed";

/**
 * Whether the 1주 기념 배너 should be shown right now, derived from the REAL
 * service start date in config (never a hardcoded "always on").
 *
 * Window: [launchDate, launchDate + milestoneWeeks*7 + windowDays) in KST — it
 * spans the run-up through the milestone and then auto-closes, so the banner
 * disappears on its own without any code change. Move `launchDate` (or the
 * milestone/window in config) and the whole window shifts.
 */
export function isMilestoneBannerActive(now: Date = new Date()): boolean {
  const launch = new Date(`${MILESTONE_BANNER.launchDate}T00:00:00+09:00`);
  if (Number.isNaN(launch.getTime())) return false;
  const totalDays = MILESTONE_BANNER.milestoneWeeks * 7 + MILESTONE_BANNER.windowDays;
  const end = new Date(launch.getTime() + totalDays * 24 * 60 * 60 * 1000);
  return now >= launch && now < end;
}
