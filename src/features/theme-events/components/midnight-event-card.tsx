"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Circle, CircleCheck, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function MidnightEventCard({
  event,
  studiedToday,
  completedFocus,
}: {
  event: { name: string; copy: string; endsAt: string } | null;
  studiedToday: boolean;
  completedFocus: boolean;
}) {
  const [active, setActive] = useState(!!event);
  useEffect(() => {
    if (!event) return;
    const remaining = new Date(event.endsAt).getTime() - Date.now();
    if (remaining <= 0) {
      setActive(false);
      return;
    }
    const timer = window.setTimeout(() => setActive(false), remaining);
    return () => window.clearTimeout(timer);
  }, [event]);
  if (!event || !active) return null;
  const complete = studiedToday && completedFocus;

  return (
    <Card className="event-midnight overflow-hidden" data-event-card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="event-moon-mark mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <MoonStar className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide">{event.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">{event.copy}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                {studiedToday ? <CircleCheck className="text-success size-3.5" aria-hidden /> : <Circle className="text-muted-foreground size-3.5" aria-hidden />}
                학습 세션 시작
              </span>
              <span className="inline-flex items-center gap-1.5">
                {completedFocus ? <CircleCheck className="text-success size-3.5" aria-hidden /> : <Circle className="text-muted-foreground size-3.5" aria-hidden />}
                오늘의 할 일 완료
              </span>
            </div>
            {complete && <p className="text-success mt-2 text-xs font-medium">오늘의 집중을 마쳤어요.</p>}
          </div>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/problems">공부 시작</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
