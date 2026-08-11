"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  NotebookPen,
  Sparkles,
  Swords,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  AppNotification,
  AppNotificationType,
} from "@/features/notifications/types";
import { cn } from "@/lib/utils";

/**
 * 알림 타입별 아이콘 + 시맨틱 색(브랜드 토큰 재사용).
 * review=info, ai_generation=success, battle=warning, 나머지=primary.
 */
const NOTIFICATION_META: Record<
  AppNotificationType,
  { icon: LucideIcon; tone: string }
> = {
  review_due: { icon: NotebookPen, tone: "text-info bg-info/12" },
  friend: { icon: Users, tone: "text-primary bg-primary/12" },
  battle_result: { icon: Swords, tone: "text-warning-foreground bg-warning/15" },
  ai_generation_done: { icon: Sparkles, tone: "text-success bg-success/12" },
  weekly_report: { icon: BarChart3, tone: "text-primary bg-primary/12" },
};

/**
 * 알림 벨 — 확장 가능한 타입별 피드(features/notifications)를 표면화한다.
 * 현재 실데이터: review_due(복습 대기), friend(친구·DM). 나머지 타입은
 * 백엔드 피드 연동 시 getNotifications가 채우면 자동으로 렌더된다.
 */
export function NotificationsMenu({
  notifications = [],
}: {
  notifications?: AppNotification[];
}) {
  const count = notifications.length;
  const hasUnread = count > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="알림" className="relative">
          <Bell className="size-4" />
          {hasUnread && (
            <span
              aria-hidden
              className="bg-primary ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          알림
          {hasUnread && (
            <span className="text-muted-foreground text-xs font-normal">
              {count > 99 ? "99+" : count}개
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasUnread ? (
          notifications.map((n) => {
            const meta = NOTIFICATION_META[n.type];
            const Icon = meta.icon;
            return (
              <DropdownMenuItem key={n.id} asChild className="items-start gap-2.5 py-2">
                <Link href={n.href}>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      meta.tone,
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.description && (
                      <span className="text-muted-foreground text-xs">{n.description}</span>
                    )}
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })
        ) : (
          <p className="text-muted-foreground px-2 py-6 text-center text-xs">
            새로운 알림이 없어요.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
