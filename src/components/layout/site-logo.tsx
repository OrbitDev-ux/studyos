import Link from "next/link";
import { siteConfig } from "@/config/site";

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
  return (
    <Link href="/" className="flex items-center gap-2">
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
