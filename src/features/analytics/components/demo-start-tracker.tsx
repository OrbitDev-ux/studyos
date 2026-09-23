"use client";

import { useEffect } from "react";
import { trackEvent } from "@/features/analytics/client";

// Fires at most once per tab session. The module-level flag guards against
// React StrictMode's effect double-invoke in dev; sessionStorage carries the
// "one demo_started per session" semantics across client navigations so a user
// poking around the demo pages isn't counted N times.
let fired = false;

/** Fires `demo_started` once when the visitor enters the public demo. */
export function DemoStartTracker() {
  useEffect(() => {
    if (fired) return;
    try {
      if (sessionStorage.getItem("studyos.demo_started")) return;
      sessionStorage.setItem("studyos.demo_started", "1");
    } catch {
      // sessionStorage can throw in privacy modes — still fire the event.
    }
    fired = true;
    trackEvent({ name: "demo_started", props: {} });
  }, []);

  return null;
}