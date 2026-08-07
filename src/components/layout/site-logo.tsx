"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { siteConfig } from "@/config/site";

const ADMIN_TRIGGER_CLICKS = 7;
const ADMIN_TRIGGER_WINDOW_MS = 3000;

function LogoMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="22" height="22" rx="6" className="fill-foreground" />
      <path
        d="M6 11.5 9.5 15 16 7"
        stroke="var(--color-background)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteLogo() {
  const router = useRouter();
  const clickCountRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Let modifier-clicks (open in new tab, etc.) behave like a normal link —
    // only plain left-clicks participate in the counter.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    // Always drive navigation ourselves instead of relying on Link's default
    // handling: clicking a Link back to the current URL ("/") repeatedly is
    // exactly what counting 1-6 needs to do, and leaving that to Link's own
    // same-URL navigation behavior makes the counter easy to accidentally
    // break. Explicit control removes that ambiguity.
    event.preventDefault();

    clickCountRef.current += 1;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, ADMIN_TRIGGER_WINDOW_MS);

    if (clickCountRef.current >= ADMIN_TRIGGER_CLICKS) {
      clickCountRef.current = 0;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      router.push("/admin-auth");
      return;
    }

    router.push("/");
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-2">
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
