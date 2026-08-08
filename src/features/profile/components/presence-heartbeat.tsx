"use client";

import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/features/profile/presence";
import { touchPresence } from "@/features/profile/actions";

/**
 * App-wide presence heartbeat. While the tab is visible it pings the server
 * every HEARTBEAT_INTERVAL_MS so the user reads as ONLINE. When the tab is
 * hidden it stops pinging, so the user drifts to IDLE and then OFFLINE — the
 * same path an abnormally closed tab takes, with no explicit disconnect needed.
 * Mounted once in the (app) layout; renders nothing.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      if (document.visibilityState === "visible") {
        void touchPresence().catch(() => {});
      }
    };

    ping(); // announce presence on mount
    const interval = setInterval(() => {
      if (!cancelled) ping();
    }, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
