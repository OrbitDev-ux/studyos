import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/layout/site-logo";

export function SiteHeader() {
  return (
    <header className="bg-background/70 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <SiteLogo />
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
