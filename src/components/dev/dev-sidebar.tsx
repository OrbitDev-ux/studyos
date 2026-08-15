"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, TerminalSquare } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { devNavItems, devSystemNavItems } from "@/features/dev/nav";
import { useI18n } from "@/features/i18n/provider";

/**
 * Study OS Dev's own sidebar — reuses the exact Sidebar UI primitives as the
 * main app (same component, same collapsible/mobile behavior; §37 responsive
 * "tabs on mobile" is this component's built-in off-canvas sheet, not a new
 * one). Styling leans developer-tool: monospace wordmark, thin borders, a
 * subtle accent — reusing the existing `--success` token rather than adding a
 * new "cyber green", so it still respects the app's light/dark theme system.
 */
export function DevSidebar() {
  const pathname = usePathname();
  const { messages } = useI18n();
  const t = messages.dev;

  return (
    <Sidebar collapsible="icon" className="font-mono">
      <SidebarHeader>
        <Link
          href="/dev"
          className="group/logo flex items-center gap-2 px-1 py-1.5 text-sm font-semibold tracking-tight"
        >
          <span className="border-success/40 text-success bg-success/10 flex size-7 shrink-0 items-center justify-center rounded-lg border">
            <TerminalSquare className="size-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">{t.sidebarLabel}</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-widest">
            {t.groupDev}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={t[item.key]}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t[item.key]}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] tracking-widest">
            {t.groupSystem}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devSystemNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={t[item.key]}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{t[item.key]}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t.backToStudyOS}>
              <Link href="/dashboard">
                <ArrowLeft />
                <span>{t.backToStudyOS}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
