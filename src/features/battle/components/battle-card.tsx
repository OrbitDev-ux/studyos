import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BATTLE_METRIC_LABEL } from "@/features/battle/constants";
import type { getBattles } from "@/features/battle/queries";

export function BattleCard({
  battle,
}: {
  battle: Awaited<ReturnType<typeof getBattles>>[number];
}) {
  const acceptedCount = battle.participants.filter((p) => p.status === "accepted").length;

  return (
    <Link href={`/battle/${battle.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {BATTLE_METRIC_LABEL[battle.metric as keyof typeof BATTLE_METRIC_LABEL]}
              </span>
              {battle.myStatus === "invited" && <Badge variant="outline">초대됨</Badge>}
              {!battle.isActive && <Badge variant="outline">종료</Badge>}
            </div>
            <p className="text-muted-foreground text-xs">참가자 {acceptedCount}명</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
