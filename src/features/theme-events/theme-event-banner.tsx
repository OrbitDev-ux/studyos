"use client";

import { useEffect, useState } from "react";
import { MoonStar } from "lucide-react";
import { ThemeEventToggle } from "@/features/theme-events/theme-event-toggle";

export function ThemeEventBanner({
  event,
}: {
  event: { name: string; copy: string; theme: string; startsAt: string; endsAt: string };
}) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const start = new Date(event.startsAt).getTime();
    const end = new Date(event.endsAt).getTime();
    const now = Date.now();
    let endTimer: number | undefined;
    const activate = () => {
      if (Date.now() >= end) return;
      setActive(true);
      endTimer = window.setTimeout(() => setActive(false), end - Date.now());
    };
    if (now >= end) {
      setActive(false);
      return;
    }
    if (now >= start) activate();
    else {
      setActive(false);
      const startTimer = window.setTimeout(activate, start - now);
      return () => {
        window.clearTimeout(startTimer);
        if (endTimer !== undefined) window.clearTimeout(endTimer);
      };
    }
    return () => {
      if (endTimer !== undefined) window.clearTimeout(endTimer);
    };
  }, [event.endsAt, event.startsAt]);

  if (!active) return null;
  return (
    <p className={`event-${event.theme} inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:text-sm`} data-event-banner>
      <span className="event-moon-mark flex size-6 shrink-0 items-center justify-center rounded-md" aria-hidden>
        <MoonStar className="size-3.5" />
      </span>
      <span className="text-left"><strong>{event.name}</strong><span className="text-muted-foreground ml-2">{event.copy}</span></span>
      <ThemeEventToggle active={active} endsAt={event.endsAt} />
    </p>
  );
}
