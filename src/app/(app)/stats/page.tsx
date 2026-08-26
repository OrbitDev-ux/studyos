import { Clock, Flame, Layers, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { WeaknessSummaryCard } from "@/features/ai/components/weakness-summary-card";
import { WeeklyReportCard } from "@/features/ai/components/weekly-report-card";
import { getLatestAiAnalysis } from "@/features/ai/queries";
import { GoalStatsCard } from "@/features/statistics/components/goal-stats-card";
import { MonthlyStatsCard } from "@/features/statistics/components/monthly-stats-card";
import { StatsEmptyState } from "@/features/statistics/components/stats-empty-state";
import { StreakCard } from "@/features/statistics/components/streak-card";
import { SubjectBreakdownCard } from "@/features/statistics/components/subject-breakdown-card";
import { SubjectPeriodCard } from "@/features/statistics/components/subject-period-card";
import { TrendCard } from "@/features/statistics/components/trend-card";
import { WeeklyStatsCard } from "@/features/statistics/components/weekly-stats-card";
import {
  getGoalStatistics,
  getMonthlyStatistics,
  getStudyTrend,
  getSubjectStatistics,
  getTodayStatistics,
  getTodaySubjectBreakdown,
  getTodayTodoCounts,
  getWeeklyStatistics,
} from "@/features/statistics/queries";
import { getStreakStats } from "@/features/study-sessions/queries";
import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { formatDuration } from "@/lib/format";
import { requireCurrentUser } from "@/lib/session";

// generateWeaknessAnalysis/generateWeeklyReport's AI calls regularly run
// past Vercel's default serverless timeout — Server Actions inherit the
// invoking route's maxDuration.
export const maxDuration = 60;

export default async function StatsPage() {
  const user = await requireCurrentUser();

  const [
    today,
    todayBreakdown,
    todoCounts,
    weekly,
    monthly,
    subjectsWeek,
    trend7,
    trend30,
    streak,
    goals,
    weaknessAnalysis,
    weeklyReport,
  ] = await Promise.all([
    getTodayStatistics(user.id, user.timezone),
    getTodaySubjectBreakdown(user.id, user.timezone),
    getTodayTodoCounts(user.id, user.timezone),
    getWeeklyStatistics(user.id, user.timezone),
    getMonthlyStatistics(user.id, user.timezone),
    getSubjectStatistics(user.id, user.timezone, "week"),
    getStudyTrend(user.id, user.timezone, 7),
    getStudyTrend(user.id, user.timezone, 30),
    getStreakStats(user.id, user.timezone),
    getGoalStatistics(user.id, user.timezone),
    getLatestAiAnalysis(user.id, "weakness"),
    getLatestAiAnalysis(user.id, "weekly-report"),
  ]);

  const completedTodos = todoCounts.find((c) => c.completed)?._count._all ?? 0;
  const totalTodos = todoCounts.reduce((sum, c) => sum + c._count._all, 0);

  const canAdvancedAnalytics = canUseFeature(accessStateFor(user), "ADVANCED_ANALYTICS");
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).stats;

  // A brand-new user has never had a StudySession — show the onboarding
  // empty state for study-time content instead of a wall of empty charts.
  // Goals don't depend on study history, so that section stays visible.
  const hasStudyHistory = streak.lastStudyDate !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 md:gap-10">
      <PageHeader title={t.title} />

      {!hasStudyHistory ? (
        <StatsEmptyState t={t} />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold">
              {t.sectionToday}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t.todayStudyTime}
                value={formatDuration(today.totalSeconds, locale)}
                icon={Clock}
              />
              <StatCard
                label={t.todaySessionsLabel}
                value={String(today.sessionCount)}
                icon={Layers}
              />
              <StatCard
                label={t.completedTodos}
                value={`${completedTodos}/${totalTodos}`}
                icon={ListChecks}
              />
              <StatCard
                label={t.streak}
                value={t.streakValue.replace("{count}", String(streak.current))}
                icon={Flame}
              />
            </div>
            <SubjectBreakdownCard breakdown={todayBreakdown} t={t} locale={locale} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold">
              {t.sectionWeek}
            </h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <WeeklyStatsCard stats={weekly} t={t} locale={locale} />
              <TrendCard trend7={trend7} trend30={trend30} t={t} locale={locale} />
            </div>
            <SubjectPeriodCard
              stats={subjectsWeek}
              t={t}
              locale={locale}
              timezone={user.timezone}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold">
              {t.sectionMonth}
            </h2>
            {canAdvancedAnalytics ? (
              <MonthlyStatsCard stats={monthly} t={t} locale={locale} />
            ) : (
              <UpgradeNotice
                title={t.proNoticeTitle}
                message={t.proNoticeMessage}
                cta={t.proNoticeCta}
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold">
              {t.sectionStreak}
            </h2>
            <StreakCard streak={streak} t={t} locale={locale} />
          </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-semibold">{t.sectionGoals}</h2>
        <GoalStatsCard stats={goals} t={t} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-semibold">
          {t.sectionAiAnalysis}
        </h2>
        {canAdvancedAnalytics ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <WeaknessSummaryCard initialContent={weaknessAnalysis?.content ?? null} />
            <WeeklyReportCard initialContent={weeklyReport?.content ?? null} />
          </div>
        ) : (
          <UpgradeNotice
            title={t.proNoticeTitle}
            message={t.proNoticeMessage}
            cta={t.proNoticeCta}
          />
        )}
      </section>
    </div>
  );
}
