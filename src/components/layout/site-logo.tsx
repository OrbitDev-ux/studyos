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
    clickCountRef.current += 1;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, ADMIN_TRIGGER_WINDOW_MS);

    if (clickCountRef.current >= ADMIN_TRIGGER_CLICKS) {
      event.preventDefault();
      clickCountRef.current = 0;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      router.push("/admin-auth");
    }
  }

  return (
    <Link href="/" onClick={handleClick} className="flex items-center gap-2">
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
