"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DevCommandPalette } from "@/components/dev/dev-command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { allDevNavItems } from "@/features/dev/nav";
import { useI18n } from "@/features/i18n/provider";

function usePageTitleKey() {
  const pathname = usePathname();
  const match = allDevNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.key ?? "navHome";
}

export function DevHeader() {
  const { messages } = useI18n();
  const t = messages.dev;
  const titleKey = usePageTitleKey();

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <span className="truncate font-mono text-sm font-semibold tracking-tight">
          {t[titleKey]}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <DevCommandPalette />
        <ThemeToggle />
      </div>
    </header>
  );
}
