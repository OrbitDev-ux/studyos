import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject } from "@/generated/prisma/client";
import { CreateMissionDialog } from "@/features/growth/components/create-mission-dialog";
import { MissionRow } from "@/features/growth/components/mission-row";
import type { getActiveMissions } from "@/features/growth/mission-queries";
import type { Messages } from "@/features/i18n/messages";

const DASHBOARD_PREVIEW_LIMIT = 3;

export function GrowthMissionCard({
  missions,
  subjects,
  t,
}: {
  missions: Awaited<ReturnType<typeof getActiveMissions>>;
  subjects: Subject[];
  t: Messages["growth"];
}) {
  const preview = missions.slice(0, DASHBOARD_PREVIEW_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.dashboardWidgetTitle}</CardTitle>
        <CreateMissionDialog subjects={subjects} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {preview.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.dashboardWidgetEmpty}</p>
        ) : (
          preview.map((mission) => <MissionRow key={mission.id} mission={mission} t={t} />)
        )}
        {missions.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="self-start gap-1">
            <Link href="/growth">
              {t.dashboardWidgetViewAll}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
