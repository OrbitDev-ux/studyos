"use client";

import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cancelMission, completeMission } from "@/features/growth/mission-actions";
import { hasAutomaticProgress, type MissionType } from "@/features/growth/mission-types";
import type { Messages } from "@/features/i18n/messages";

type Mission = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  currentValue: number;
  targetValue: number;
};

export function MissionRow({ mission, t }: { mission: Mission; t: Messages["growth"] }) {
  const [isPending, startTransition] = useTransition();
  const percent =
    mission.targetValue > 0
      ? Math.min(100, Math.round((mission.currentValue / mission.targetValue) * 100))
      : 0;
  const isActive = mission.status === "PENDING" || mission.status === "IN_PROGRESS";
  const canCompleteManually = isActive && !hasAutomaticProgress(mission.type as MissionType);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="min-w-0">
          <span className="font-medium">{mission.title}</span>
          {mission.description && (
            <span className="text-muted-foreground ml-2 truncate text-xs">
              {mission.description}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mission.status === "COMPLETED" && (
            <Badge variant="success">{t.missionCompleted}</Badge>
          )}
          {mission.status === "CANCELLED" && (
            <Badge variant="outline">{t.missionCancelled}</Badge>
          )}
          <span className="text-muted-foreground tabular-nums">
            {mission.currentValue} / {mission.targetValue}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={percent} className="h-2" />
        {canCompleteManually && (
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={isPending}
            aria-label={t.missionComplete}
            onClick={() =>
              startTransition(() => {
                void completeMission(mission.id);
              })
            }
          >
            <Check className="size-3.5" />
          </Button>
        )}
        {isActive && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isPending}
            aria-label={t.missionCancel}
            onClick={() => startTransition(() => cancelMission(mission.id))}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      {isActive && hasAutomaticProgress(mission.type as MissionType) && (
        <p className="text-muted-foreground text-xs">{t.missionAutoProgress}</p>
      )}
    </div>
  );
}
