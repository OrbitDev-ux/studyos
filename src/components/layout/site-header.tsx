import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export function SiteHeader() {
  return (
    <header className="bg-background/70 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-sm font-semibold tracking-tight">{siteConfig.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            로그인
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
