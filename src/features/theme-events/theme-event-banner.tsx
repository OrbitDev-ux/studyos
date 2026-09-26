"use client";

import { useEffect, useState } from "react";
import { MoonStar } from "lucide-react";
import { ThemeEventToggle } from "@/features/theme-events/theme-event-toggle";

export function ThemeEventBanner({
  event,
}: {
  event: { name: string; copy: string; startsAt: string; endsAt: string };
}) {
  const [active, setActive] = useState(true);
  useEffect(() => {
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();
    const now = Date.now();
    if (now < start || now >= end) {
      setActive(false);
      return;
    }
    const timer = window.setTimeout(() => setActive(false), end - now);
    return () => window.clearTimeout(timer);
  }, [event.endsAt, event.startsAt]);

  if (!active) return null;
  return (
    <p className="event-midnight inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm" data-event-banner>
      <span className="event-moon-mark flex size-6 shrink-0 items-center justify-center rounded-md" aria-hidden>
        <MoonStar className="size-3.5" />
      </span>
      <span className="text-left"><strong>{event.name}</strong><span className="text-muted-foreground ml-2">7일 동안 찾아온 작은 밤의 테마</span></span>
      <ThemeEventToggle active={active} endsAt={event.endsAt} />
    </p>
  );
}
