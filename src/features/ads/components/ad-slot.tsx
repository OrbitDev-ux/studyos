"use client";

import Script from "next/script";
import {
  ADSENSE_CLIENT_ID,
  getAdSlot,
  isAdSenseConfigured,
  type AdPlacement,
} from "@/features/ads/config";
import { cn } from "@/lib/utils";

/**
 * The single ad component used everywhere. Rendering rules:
 *  - `show` is decided on the SERVER from the user's plan (shouldShowAds) and
 *    passed in — only TRIAL-active users see ads; paid/expired never do.
 *  - When `show` is false → renders nothing.
 *  - When shown but AdSense isn't configured, or not in production → a clearly
 *    labeled placeholder (never disguised as content), with a reserved height so
 *    the layout doesn't jump.
 *  - When configured in production → the real AdSense unit; a load failure only
 *    affects this box, never the app (the reserved area just stays empty).
 *
 * Never place this inside a problem's flow, between choices, or over the timer
 * (see the plan spec's ad-placement rules) — callers position it around content.
 */
export function AdSlot({
  placement,
  show = false,
  className,
}: {
  placement: AdPlacement;
  show?: boolean;
  className?: string;
}) {
  if (!show) return null;

  const useReal = isAdSenseConfigured(placement) && process.env.NODE_ENV === "production";

  if (!useReal) {
    return (
      <div
        className={cn(
          "text-muted-foreground/70 flex min-h-[100px] items-center justify-center rounded-md border border-dashed text-xs",
          className,
        )}
        aria-label="광고 영역"
      >
        광고 {process.env.NODE_ENV !== "production" && "(개발용 placeholder)"}
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ minHeight: 100 }}
      aria-label="광고"
    >
      {/* Loaded once for the whole app (deduped by id). */}
      <Script
        id="adsbygoogle-js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      />
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={getAdSlot(placement)}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script id={`adsbygoogle-push-${placement}`} strategy="afterInteractive">
        {`try{(adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}`}
      </Script>
    </div>
  );
}
