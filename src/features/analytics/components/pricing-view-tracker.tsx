"use client";

import { useEffect } from "react";
import { trackEvent } from "@/features/analytics/client";

// Guards against React StrictMode's effect double-invoke in dev so a single
// /pricing visit isn't counted twice. Unlike demo_started there's deliberately
// no sessionStorage dedupe: a refresh or re-visit IS another pricing_viewed.
let fired = false;

/** Fires `pricing_viewed` each time the /pricing page mounts. */
export function PricingViewTracker() {
  useEffect(() => {
    if (fired) return;
    fired = true;
    trackEvent({ name: "pricing_viewed", props: {} });
  }, []);

  return null;
}