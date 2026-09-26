"use client";

import { useEffect, useState } from "react";
import { Moon, MoonStar } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "studyos:midnight-event-theme";

export function ThemeEventToggle({ active, endsAt }: { active: boolean; endsAt: string }) {
  const [enabled, setEnabled] = useState(true);
  const [available, setAvailable] = useState(active);

  useEffect(() => {
    if (!active || Date.now() >= new Date(endsAt).getTime()) {
      delete document.documentElement.dataset.studyEvent;
      setAvailable(false);
      return;
    }
    setAvailable(true);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next = stored !== "off";
    setEnabled(next);
    document.documentElement.dataset.studyEvent = next ? "midnight" : "off";
  }, [active, endsAt]);

  function toggle() {
    if (!active) return;
    const next = !enabled;
    setEnabled(next);
    document.documentElement.dataset.studyEvent = next ? "midnight" : "off";
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  }

  useEffect(() => {
    if (!active) return;
    const remaining = new Date(endsAt).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setAvailable(false);
      delete document.documentElement.dataset.studyEvent;
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [active, endsAt]);

  if (!active || !available) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-11"
      onClick={toggle}
      aria-label={enabled ? "이벤트 테마 끄기" : "이벤트 테마 켜기"}
      title={enabled ? "이벤트 테마 끄기" : "이벤트 테마 켜기"}
    >
      {enabled ? <MoonStar /> : <Moon />}
    </Button>
  );
}
