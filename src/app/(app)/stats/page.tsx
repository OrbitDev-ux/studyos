import { Clock, Flame, ListChecks } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { SubjectBreakdownCard } from "@/features/statistics/components/subject-breakdown-card";
import {
  getTodaySubjectBreakdown,
  getTodayTodoCounts,
} from "@/features/statistics/queries";
import { getStreak, getTodayStudySeconds } from "@/features/study-sessions/queries";
import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { formatDuration } from "@/lib/format";
import { requireCurrentUser } from "@/lib/session";

export default async function StatsPage() {
  const user = await requireCurrentUser();

  const [todaySeconds, streak, todoCounts, breakdown] = await Promise.all([
    getTodayStudySeconds(user.id, user.timezone),
    getStreak(user.id, user.timezone),
    getTodayTodoCounts(user.id, user.timezone),
    getTodaySubjectBreakdown(user.id, user.timezone),
  ]);

  const completedCount = todoCounts.find((c) => c.completed)?._count._all ?? 0;
  const totalCount = todoCounts.reduce((sum, c) => sum + c._count._all, 0);

  const canAdvancedAnalytics = canUseFeature(accessStateFor(user), "ADVANCED_ANALYTICS");
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).stats;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {!canAdvancedAnalytics && (
        <UpgradeNotice
          title={t.proNoticeTitle}
          message={t.proNoticeMessage}
          cta={t.proNoticeCta}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t.todayStudyTime}
          value={formatDuration(todaySeconds, locale)}
          icon={Clock}
        />
        <StatCard
          label={t.completedTodos}
          value={`${completedCount}/${totalCount}`}
          icon={ListChecks}
        />
        <StatCard
          label={t.streak}
          value={t.streakValue.replace("{count}", String(streak))}
          icon={Flame}
        />
      </div>

      <SubjectBreakdownCard breakdown={breakdown} t={t} locale={locale} />
    </div>
  );
}
