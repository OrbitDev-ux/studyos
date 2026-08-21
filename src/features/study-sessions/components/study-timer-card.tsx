"use client";

import { Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startStudySession, stopStudySession } from "@/features/study-sessions/actions";
import { useI18n } from "@/features/i18n/provider";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function StudyTimerCard({
  todaySeconds,
  activeStartedAt,
}: {
  todaySeconds: number;
  activeStartedAt: string | null;
}) {
  const { messages } = useI18n();
  const t = messages.stats;
  const isActive = activeStartedAt !== null;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeStartedAt) return;
    const startedAtMs = new Date(activeStartedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAtMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeStartedAt]);

  const displaySeconds = todaySeconds + (isActive ? elapsed : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.todayStudyTime}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {formatDuration(displaySeconds)}
        </span>
        <form action={isActive ? stopStudySession : startStudySession}>
          <Button
            type="submit"
            variant={isActive ? "destructive" : "default"}
            className="gap-1.5"
          >
            {isActive ? <Square className="size-4" /> : <Play className="size-4" />}
            {isActive ? t.timerStop : t.timerStart}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
