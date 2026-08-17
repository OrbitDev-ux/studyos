import { Flame, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import type { StreakStats } from "@/features/study-sessions/streak";
import { formatShortDate, parseDateOnly } from "@/lib/date";

export function StreakCard({
  streak,
  t,
  locale,
}: {
  streak: StreakStats;
  t: Messages["stats"];
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.streakTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {streak.lastStudyDate === null ? (
          <p className="text-muted-foreground text-sm">{t.streakNeverStudied}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2.5">
                <Flame className="text-warning size-6 shrink-0" />
                <div>
                  <p className="text-xl leading-none font-semibold tabular-nums">
                    {t.streakValue.replace("{count}", String(streak.current))}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t.streakCurrentLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Trophy className="text-muted-foreground size-6 shrink-0" />
                <div>
                  <p className="text-xl leading-none font-semibold tabular-nums">
                    {t.streakValue.replace("{count}", String(streak.longest))}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t.streakLongestLabel}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground border-t pt-3 text-xs">
              {t.streakLastStudyLabel}:{" "}
              {formatShortDate(parseDateOnly(streak.lastStudyDate), locale)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
