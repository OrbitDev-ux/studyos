import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { battleMetricLabel } from "@/features/battle/constants";
import type { getBattles } from "@/features/battle/queries";
import type { Messages } from "@/features/i18n/messages";

export function BattleCard({
  battle,
  t,
}: {
  battle: Awaited<ReturnType<typeof getBattles>>[number];
  t: Messages["battle"];
}) {
  const acceptedCount = battle.participants.filter((p) => p.status === "accepted").length;

  return (
    <Link href={`/battle/${battle.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {battleMetricLabel(t, battle.metric)}
              </span>
              {battle.myStatus === "invited" && <Badge variant="outline">{t.badgeInvited}</Badge>}
              {battle.myStatus === "left" && <Badge variant="outline">{t.badgeLeft}</Badge>}
              {!battle.isActive && <Badge variant="outline">{t.badgeEnded}</Badge>}
            </div>
            <p className="text-muted-foreground text-xs">
              {t.participants.replace("{count}", String(acceptedCount))}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
