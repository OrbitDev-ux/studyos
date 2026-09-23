"use client";

import { track } from "@vercel/analytics";
import type { AnalyticsEvent } from "@/features/analytics/events";

/**
 * Client-side event sink for the analytics SLA (events.ts). Fires into the
 * Vercel Web Analytics beacon (`track` from @vercel/analytics), which is
 * already mounted in the root layout and only sends on Vercel deployments.
 * Same contract as capture(): typed via AnalyticsEvent and guaranteed not to
 * throw or block whatever triggered the event.
 */
export function trackEvent(event: AnalyticsEvent): void {
  try {
    track(event.name, event.props);
  } catch {
    // Analytics must never break the UI interaction that fired the event.
  }
}