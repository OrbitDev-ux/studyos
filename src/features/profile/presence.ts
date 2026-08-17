export type OnlineStatus = "ONLINE" | "IDLE" | "OFFLINE";

/**
 * How often the client heartbeat pings while a tab is visible (ms).
 *
 * Was 45s — this heartbeat is mounted app-wide (every authenticated session,
 * every page, not just social screens), so that interval meant a DB write
 * every 45s for the entire lifetime of every open tab, regardless of whether
 * presence is ever actually looked at (Product Audit §Presence). "Is my
 * friend online right now" doesn't need second-scale precision, so the
 * interval is doubled to halve write volume; ONLINE/IDLE windows below are
 * scaled by the same 2x to keep the exact same accuracy *shape* (same
 * interval:window ratios), not just a looser one.
 */
export const HEARTBEAT_INTERVAL_MS = 90_000;

// Windows for deriving status from the last heartbeat. A visible tab pings
// every ~90s so it stays ONLINE; a backgrounded tab stops pinging and drifts
// ONLINE → IDLE → OFFLINE, and an abnormally closed tab reaches OFFLINE the
// same way without any explicit disconnect signal.
const ONLINE_WINDOW_MS = 180_000; // < 3 min → ONLINE
const IDLE_WINDOW_MS = 10 * 60_000; // < 10 min → IDLE, else OFFLINE

/** Derive ONLINE/IDLE/OFFLINE from a heartbeat timestamp. Null → OFFLINE. */
export function deriveOnlineStatus(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): OnlineStatus {
  if (!lastSeenAt) return "OFFLINE";
  const seen = lastSeenAt instanceof Date ? lastSeenAt.getTime() : Date.parse(lastSeenAt);
  if (Number.isNaN(seen)) return "OFFLINE";
  const age = now - seen;
  if (age < ONLINE_WINDOW_MS) return "ONLINE";
  if (age < IDLE_WINDOW_MS) return "IDLE";
  return "OFFLINE";
}

export const STATUS_LABEL: Record<OnlineStatus, string> = {
  ONLINE: "온라인",
  IDLE: "자리 비움",
  OFFLINE: "오프라인",
};

/** Tailwind color class for the status dot, matching the design tokens. */
export const STATUS_DOT_CLASS: Record<OnlineStatus, string> = {
  ONLINE: "bg-emerald-500",
  IDLE: "bg-amber-500",
  OFFLINE: "bg-muted-foreground/40",
};
