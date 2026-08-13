"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { SearchDialog } from "@/components/layout/search-dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navItems } from "@/config/nav";
import { useI18n } from "@/features/i18n/provider";
import type { AppNotification } from "@/features/notifications/types";

/** 현재 경로에 해당하는 내비 항목의 i18n key. 가장 길게 매칭되는 항목을 고른다. */
function usePageTitleKey() {
  const pathname = usePathname();
  const match = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? null;
}

export function Header({ notifications = [] }: { notifications?: AppNotification[] }) {
  const { messages } = useI18n();
  const titleKey = usePageTitleKey();
  const title = titleKey ? messages.nav[titleKey] : null;

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        {title && <span className="truncate text-sm font-semibold tracking-tight">{title}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <SearchDialog />
        <NotificationsMenu notifications={notifications} />
        <ThemeToggle />
      </div>
    </header>
  );
}
