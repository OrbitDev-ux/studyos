"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const LOW_TIME_THRESHOLD_SEC = 60;

export function ExamTimer({
  timeLimitSec,
  onExpire,
}: {
  timeLimitSec: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(timeLimitSec);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      onExpireRef.current();
    }
  }, [remaining]);

  return (
    <span
      className={cn(
        "font-mono text-lg font-semibold tabular-nums",
        remaining <= LOW_TIME_THRESHOLD_SEC && "text-destructive",
      )}
    >
      {formatTime(remaining)}
    </span>
  );
}
