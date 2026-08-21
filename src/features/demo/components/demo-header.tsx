"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navItems } from "@/config/nav";
import { useI18n } from "@/features/i18n/provider";

/** Same page-title lookup as the real Header. */
function usePageTitleKey() {
  const pathname = usePathname();
  const match = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? null;
}

/**
 * Demo-only header. Same layout as the real app Header, but deliberately
 * WITHOUT SearchDialog/NotificationsMenu — both call server actions that
 * demand a real signed-in session, which redirects a signed-out demo visitor
 * straight to /login, and would otherwise leak a signed-in visitor's real
 * notifications into the "DEMO MODE" screen (Security audit: /demo must read
 * no real data and require no auth — see demo/layout.tsx's module doc comment).
 */
export function DemoHeader() {
  const { messages } = useI18n();
  const titleKey = usePageTitleKey();
  const title = titleKey ? messages.nav[titleKey] : null;

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        {title && (
          <span className="text-muted-foreground truncate text-sm font-medium">
            {title}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
      </div>
    </header>
  );
}
