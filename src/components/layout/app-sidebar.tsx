"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Sparkles } from "lucide-react";
import type { Session } from "next-auth";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navGroups } from "@/config/nav";
import { siteConfig } from "@/config/site";
import { useI18n } from "@/features/i18n/provider";

export function AppSidebar({
  user,
  socialCount = 0,
  showUpgrade = false,
}: {
  user: Session["user"];
  socialCount?: number;
  /** Show the "업그레이드하기" CTA (hidden for PREMIUM users). */
  showUpgrade?: boolean;
}) {
  const pathname = usePathname();
  const { messages } = useI18n();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="group/logo flex items-center gap-2 px-1 py-1.5 text-sm font-semibold tracking-tight"
        >
          {/* 브랜드 시그니처 마크: 인디고 그라디언트 배지(토큰 파생색) + 미세 상승 모션 */}
          <span className="from-primary text-primary-foreground shadow-primary/30 ring-primary/20 flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br to-[color-mix(in_oklch,var(--primary),black_22%)] shadow-sm ring-1 transition-transform duration-200 group-hover/logo:-translate-y-0.5 group-hover/logo:scale-105">
            <GraduationCap className="size-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">{siteConfig.name}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{messages.groups[group.labelKey]}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const badge = item.href === "/social" ? socialCount : 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={messages.nav[item.key]}
                      >
                        <Link href={item.href}>
                          <item.icon />
                          <span>{messages.nav[item.key]}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge > 0 && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground">
                          {badge > 99 ? "99+" : badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {showUpgrade && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/pricing")}
                tooltip={messages.account.upgrade}
                className="text-primary"
              >
                <Link href="/pricing">
                  <Sparkles />
                  <span>{messages.account.upgrade}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
