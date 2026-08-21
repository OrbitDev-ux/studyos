"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavItems } from "@/config/nav";
import { useI18n } from "@/features/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * 모바일 하단 바텀 네비게이션.
 * 데스크톱(md+)에서는 사이드바가 대신하므로 숨긴다. 각 탭은 최소 44px 터치 타깃.
 */
export function BottomNav({ socialCount = 0 }: { socialCount?: number }) {
  const pathname = usePathname();
  const { messages } = useI18n();

  return (
    <nav
      aria-label={messages.nav.mainMenu}
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch">
        {bottomNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = item.href === "/social" ? socialCount : 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:outline-ring relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.65rem] font-medium transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-3px]",
                  active
                    ? "text-primary after:bg-primary after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <item.icon className="size-5" />
                  {badge > 0 && (
                    <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] leading-none">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                {messages.nav[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
