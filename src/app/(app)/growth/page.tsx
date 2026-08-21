import { GrowthSummaryCard } from "@/features/growth/components/growth-summary-card";
import { MissionListCard } from "@/features/growth/components/mission-list-card";
import { XpEventList } from "@/features/growth/components/xp-event-list";
import { getGrowthSummary, getRecentXpEvents } from "@/features/growth/queries";
import { getUserMissions } from "@/features/growth/mission-queries";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const ACTIVITY_HISTORY_LIMIT = 20;

export default async function GrowthPage() {
  const user = await requireCurrentUser();

  const [summary, missions, xpEvents, subjects] = await Promise.all([
    getGrowthSummary(user.id, user.timezone),
    getUserMissions(user.id),
    getRecentXpEvents(user.id, ACTIVITY_HISTORY_LIMIT),
    getSubjects(user.id),
  ]);

  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).growth;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 md:gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.pageTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.pageSubtitle}</p>
      </div>

      <GrowthSummaryCard summary={summary} locale={locale} t={t} />

      <div className="grid gap-5 lg:grid-cols-2">
        <MissionListCard missions={missions} subjects={subjects} t={t} />
        <XpEventList events={xpEvents} locale={locale} t={t} />
      </div>
    </div>
  );
}
