import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject } from "@/generated/prisma/client";
import { CreateMissionDialog } from "@/features/growth/components/create-mission-dialog";
import { MissionRow } from "@/features/growth/components/mission-row";
import type { getUserMissions } from "@/features/growth/mission-queries";
import type { Messages } from "@/features/i18n/messages";

export function MissionListCard({
  missions,
  subjects,
  t,
}: {
  missions: Awaited<ReturnType<typeof getUserMissions>>;
  subjects: Subject[];
  t: Messages["growth"];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t.missionSectionTitle}</CardTitle>
        <CreateMissionDialog subjects={subjects} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {missions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.missionEmpty}</p>
        ) : (
          missions.map((mission) => <MissionRow key={mission.id} mission={mission} t={t} />)
        )}
      </CardContent>
    </Card>
  );
}
