"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/features/i18n/config";
import { formatShortDate, parseDateOnly } from "@/lib/date";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_LABELED_BARS = 10;

/**
 * Daily study-time bar chart. One series (magnitude over time) → a single
 * hue (bg-primary), per dataviz guidance — no categorical color needed.
 * Days are already zero-filled by the caller's aggregation (see
 * bucketSecondsByDay), so a legitimate 0-second day renders as a real
 * (near-zero) bar rather than being skipped.
 */
export function TrendBarChart({
  data,
  locale,
}: {
  data: { date: string; seconds: number }[];
  locale: Locale;
}) {
  const max = Math.max(1, ...data.map((d) => d.seconds));
  // Dense (30-day) charts only label every Nth bar so text never collides.
  const labelStride = Math.max(1, Math.ceil(data.length / MAX_LABELED_BARS));

  return (
    <div
      className="flex h-32 items-end gap-1"
      role="img"
      aria-label="일별 학습 시간 그래프"
    >
      {data.map((d, i) => {
        const heightPercent = Math.max(2, Math.round((d.seconds / max) * 100));
        const showLabel =
          data.length <= 7 || i === data.length - 1 || i % labelStride === 0;
        const date = parseDateOnly(d.date);
        const weekday = new Intl.DateTimeFormat(locale, {
          weekday: "short",
          timeZone: "UTC",
        }).format(date);

        return (
          <Tooltip key={d.date}>
            <TooltipTrigger asChild>
              <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <div className="bg-muted flex h-full w-full items-end overflow-hidden rounded-sm">
                  <div
                    className={cn(
                      "w-full rounded-sm transition-all",
                      d.seconds > 0 ? "bg-primary" : "bg-muted-foreground/20",
                    )}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-full truncate text-center text-[10px] tabular-nums">
                  {showLabel ? (data.length <= 7 ? weekday : date.getUTCDate()) : ""}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {formatShortDate(date, locale)} · {formatDuration(d.seconds, locale)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
