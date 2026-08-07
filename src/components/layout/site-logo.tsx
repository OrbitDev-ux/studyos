"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";

const ADMIN_TRIGGER_CLICKS = 7;
const ADMIN_TRIGGER_WINDOW_MS = 3000;

// Module-level, not component state: a normal logo click navigates home, which
// can unmount and remount this component (it lives in the marketing header, and
// non-landing marketing pages leave for "/" on the first click). Component refs
// would reset on that remount, so the count could never reach the threshold.
// Module scope survives remounts within the session, so the clicks accumulate.
let clickCount = 0;
let lastClickAt = 0;

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

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Let modifier-clicks (open in new tab, etc.) behave like a normal link —
    // only plain left-clicks participate in the counter.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    const now = Date.now();
    // Reset the run when the previous click was too long ago; otherwise extend.
    clickCount = now - lastClickAt > ADMIN_TRIGGER_WINDOW_MS ? 1 : clickCount + 1;
    lastClickAt = now;

    if (clickCount >= ADMIN_TRIGGER_CLICKS) {
      clickCount = 0;
      lastClickAt = 0;
      event.preventDefault();
      router.push("/admin-auth");
      return;
    }

    // Below the threshold: let the Link navigate home as usual. The count lives
    // in module scope, so it survives the remount that navigation may cause.
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-2">
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
