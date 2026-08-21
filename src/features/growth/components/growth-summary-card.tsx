import { CheckCircle2, Clock, Flame, Trophy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { GrowthSummary } from "@/features/growth/queries";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import { formatDuration } from "@/lib/format";

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="text-primary size-5 shrink-0" />
      <div>
        <p className="text-lg leading-none font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
      </div>
    </div>
  );
}

export function GrowthSummaryCard({
  summary,
  locale,
  t,
}: {
  summary: GrowthSummary;
  locale: Locale;
  t: Messages["growth"];
}) {
  const { level } = summary;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 pt-6">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-semibold tracking-tight">
              {t.levelLabel.replace("{level}", String(level.level))}
            </p>
            <p className="text-muted-foreground text-sm tabular-nums">
              {t.xpToNextLevel
                .replace("{current}", level.currentLevelXp.toLocaleString())
                .replace("{total}", level.xpForNextLevel.toLocaleString())}
            </p>
          </div>
          <Progress value={level.progressRatio * 100} className="mt-2 h-2.5" />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat
            icon={Flame}
            value={`${summary.currentStreak}${t.streakUnit}`}
            label={t.statCurrentStreak}
          />
          <Stat
            icon={Trophy}
            value={`${summary.longestStreak}${t.streakUnit}`}
            label={t.statLongestStreak}
          />
          <Stat
            icon={Clock}
            value={formatDuration(summary.totalStudySeconds, locale)}
            label={t.statTotalStudyTime}
          />
          <Stat
            icon={CheckCircle2}
            value={summary.missionsCompleted.toLocaleString()}
            label={t.statMissionsCompleted}
          />
          <Stat icon={Zap} value={summary.totalXp.toLocaleString()} label={t.statTotalXp} />
        </div>
      </CardContent>
    </Card>
  );
}
