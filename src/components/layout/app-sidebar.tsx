"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { Session } from "next-auth";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems } from "@/config/nav";
import { siteConfig } from "@/config/site";

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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold tracking-tight"
        >
          {siteConfig.name}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const badge = item.href === "/social" ? socialCount : 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
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
      </SidebarContent>
      <SidebarFooter>
        {showUpgrade && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/pricing")}
                tooltip="업그레이드하기"
                className="text-primary"
              >
                <Link href="/pricing">
                  <Sparkles />
                  <span>업그레이드하기</span>
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
