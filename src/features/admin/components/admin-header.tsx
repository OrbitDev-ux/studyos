"use client";

import { Bell, LogOut, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminRole } from "@/generated/prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { adminSignOut } from "@/features/admin/actions";
import { ROLE_LABELS } from "@/lib/admin/permissions";

export type AdminNotification = {
  id: string;
  label: string;
  href: string;
};

export function AdminHeader({
  admin,
  notifications,
  maintenance,
}: {
  admin: { name: string | null; email: string; role: AdminRole };
  notifications: AdminNotification[];
  maintenance?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const initial = (admin.name ?? admin.email).at(0)?.toUpperCase() ?? "?";

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/admin/users?q=${encodeURIComponent(trimmed)}` : "/admin/users",
    );
  }

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4" />
        <form onSubmit={onSearch} className="relative hidden sm:block">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="사용자 검색..."
            aria-label="사용자 검색"
            className="h-8 w-48 pl-7 lg:w-64"
          />
        </form>
        {maintenance && (
          <Badge variant="warning" className="animate-pulse">
            🚧 Maintenance Mode
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="알림">
              <Bell className="size-4" />
              {notifications.length > 0 && (
                <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>알림</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-xs">
                새로운 알림이 없습니다.
              </p>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} asChild>
                  <Link href={n.href} className="text-sm">
                    {n.label}
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-1.5">
              <Avatar className="size-6">
                <AvatarFallback className="text-xs">{initial}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm sm:inline">
                {admin.name ?? admin.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="truncate">{admin.name ?? "관리자"}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {admin.email}
              </span>
              <Badge variant="secondary" className="mt-1 w-fit">
                {ROLE_LABELS[admin.role]}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={adminSignOut}>
              <button
                type="submit"
                className="hover:bg-muted flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <LogOut className="size-4" />
                로그아웃
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
