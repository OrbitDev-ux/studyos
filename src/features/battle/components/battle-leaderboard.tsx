import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { BattleProgressBar } from "@/features/battle/components/battle-progress-bar";
import { formatBattleScore } from "@/features/battle/constants";
import type { getBattle } from "@/features/battle/queries";
import type { Locale } from "@/features/i18n/config";
import { cn } from "@/lib/utils";

export function BattleLeaderboard({
  leaderboard,
  metric,
  currentUserId,
  emptyMessage,
  locale,
}: {
  leaderboard: NonNullable<Awaited<ReturnType<typeof getBattle>>>["leaderboard"];
  metric: string;
  currentUserId: string;
  emptyMessage: string;
  locale: Locale;
}) {
  if (leaderboard.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  const maxScore = leaderboard[0]?.score ?? 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {leaderboard.map((entry) => (
          <div
            key={entry.userId}
            className={cn(
              "flex flex-col gap-1.5",
              entry.userId === currentUserId && "font-medium",
            )}
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-muted-foreground w-4 shrink-0">{entry.rank}</span>
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ""} />
                  <AvatarFallback>{(entry.name ?? entry.email).at(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{entry.name ?? entry.email}</span>
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {formatBattleScore(metric, entry.score, locale)}
              </span>
            </div>
            <BattleProgressBar value={entry.score} max={maxScore} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
