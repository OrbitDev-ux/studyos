import "server-only";
import type { AnalyticsEvent } from "@/features/analytics/events";

/**
 * Server-side event sink for the analytics SLA (events.ts).
 *
 * Today: dev builds log a structured line; production is a silent no-op. The
 * important property is what this does NOT do: it never throws, never makes a
 * network/DB call, and never blocks the business action that fired it.
 *
 * Transport seam: when a server-side analytics sink lands (Plausible/GA4/
 * retention events endpoint), route `ANALYTICS_EVENTS_PROVIDER` here and keep
 * every call site untouched — the union in events.ts is all they can pass.
 * Keep this function dependency-free (no prisma, no auth) so it stays
 * trivially safe to call from anywhere, including inside billing transactions
 * and cron jobs.
 */
export function capture(event: AnalyticsEvent): void {
  try {
    if (process.env.NODE_ENV !== "production") {
      // Dev visibility only; the real sink (when wired) reads the same shape.
      console.info(`[analytics] ${event.name}`, JSON.stringify(event.props));
    }
  } catch {
    // Analytics must never break the action that fired the event.
  }
}