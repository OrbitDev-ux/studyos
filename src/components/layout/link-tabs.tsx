"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabsListVariants } from "@/components/ui/tabs";
import { useI18n } from "@/features/i18n/provider";
import type { Messages } from "@/features/i18n/messages";
import { cn } from "@/lib/utils";

/**
 * A Tabs-styled row of real navigation links between two related pages that
 * used to be separate top-level sidebar destinations (e.g. 문제 ↔ 문제은행,
 * 랭킹 ↔ 챌린지). Not Radix Tabs — each "tab" is a full route change, so this
 * stays a plain Link instead of switching in-page content, avoiding pulling
 * a second page's data-fetching into this one.
 */
export function LinkTabs({
  items,
}: {
  items: readonly { href: string; labelKey: keyof Messages["nav"] }[];
}) {
  const pathname = usePathname();
  const { messages } = useI18n();

  return (
    <div
      className={cn(tabsListVariants({ variant: "line" }), "max-w-full overflow-x-auto")}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active || undefined}
            className="text-foreground/60 hover:text-foreground data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all data-active:shadow-sm"
          >
            {messages.nav[item.labelKey]}
          </Link>
        );
      })}
    </div>
  );
}
