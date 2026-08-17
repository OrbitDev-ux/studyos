import Link from "next/link";
import { ArrowRight, Flame, ListChecks, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginExperience } from "@/features/login-experience/login-experience";
import { TodayGoalsCard } from "@/features/goals/components/today-goals-card";
import { getTodayGoals } from "@/features/goals/queries";
import { TodayMockExamCard } from "@/features/mock-exam/components/today-mock-exam-card";
import { getRecentMockExams } from "@/features/mock-exam/queries";
import { RecommendedProblemsCard } from "@/features/problems/components/recommended-problems-card";
import { getRecentProblems } from "@/features/problems/queries";
import { TodayReviewCard } from "@/features/review/components/today-review-card";
import { getDueReviews, getDueReviewCount } from "@/features/review/queries";
import { WeaknessCard } from "@/features/learning/components/weakness-card";
import { getTopWeaknesses } from "@/features/learning/weakness";
import { DailyMissionCard } from "@/features/learning/components/daily-mission-card";
import { getDailyMissionBoard } from "@/features/learning/mission-queries";
import { WeakProblemsCard } from "@/features/learning/components/weak-problems-card";
import { getWeakProblemBoard } from "@/features/learning/weak-problems-queries";
import { MilestoneBanner } from "@/features/announcements/components/milestone-banner";
import { OnboardingLauncher } from "@/features/onboarding/components/onboarding-launcher";
import { getOnboardingState } from "@/features/onboarding/queries";
import { TrialBanner } from "@/features/billing/components/trial-banner";
import { getPlanSummary } from "@/features/billing/usage";
import { adsVisibleFor } from "@/features/billing/access";
import { AdSlot } from "@/features/ads/components/ad-slot";
import {
  getActiveStudySession,
  getStreak,
  getTodayStudySeconds,
} from "@/features/study-sessions/queries";
import { StudyTimerCard } from "@/features/study-sessions/components/study-timer-card";
import { WeeklyTrendMiniCard } from "@/features/statistics/components/weekly-trend-mini-card";
import { getWeeklyStatistics } from "@/features/statistics/queries";
import { getSubjects } from "@/features/subjects/queries";
import { TodayTodosCard } from "@/features/todos/components/today-todos-card";
import { getTodayTodos } from "@/features/todos/queries";
import { formatLongDate } from "@/lib/date";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const CARD_PREVIEW_LIMIT = 3;

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const [
    activeSession,
    todaySeconds,
    streak,
    goals,
    todos,
    subjects,
    recentProblems,
    dueReviews,
    dueCount,
    recentExams,
    topWeaknesses,
    missionBoard,
    weakProblemBoard,
    onboarding,
    planSummary,
    weeklyStats,
  ] = await Promise.all([
    getActiveStudySession(user.id),
    getTodayStudySeconds(user.id, user.timezone),
    getStreak(user.id, user.timezone),
    getTodayGoals(user.id, user.timezone),
    getTodayTodos(user.id, user.timezone),
    getSubjects(user.id),
    getRecentProblems(user.id, CARD_PREVIEW_LIMIT),
    getDueReviews(user.id, CARD_PREVIEW_LIMIT),
    getDueReviewCount(user.id),
    getRecentMockExams(user.id, CARD_PREVIEW_LIMIT),
    getTopWeaknesses(user.id, 5),
    getDailyMissionBoard(user.id, user.timezone),
    getWeakProblemBoard(user.id, user.timezone),
    getOnboardingState(user.id),
    getPlanSummary(user.id),
    getWeeklyStatistics(user.id, user.timezone),
  ]);
  const showAds = adsVisibleFor(user);
  const locale = await getServerLocale(user.locale);
  const messages = getMessages(locale);
  const t = messages.dashboard;

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent =
    todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 100);

  // 히어로 CTA는 "지금 무엇을 해야 하는가"를 하나로 압축한다.
  // 복습 대기가 있으면 최우선(망각 곡선), 없으면 오늘 학습 시작으로 유도.
  const hero =
    dueCount > 0
      ? {
          eyebrow: t.priorityEyebrow,
          title: t.reviewWaitingTitle.replace("{count}", String(dueCount)),
          desc: t.reviewWaitingDesc,
          cta: t.reviewCta,
          href: "/review",
          Icon: NotebookPen,
        }
      : {
          eyebrow: t.todayEyebrow,
          title: t.newProblemsTitle,
          desc: t.newProblemsDesc,
          cta: t.newProblemsCta,
          href: "/problems",
          Icon: Sparkles,
        };

  return (
    <div className="flex flex-col gap-8">
      <LoginExperience role="user" />

      <MilestoneBanner />

      <TrialBanner summary={planSummary} />

      {/* ── HERO: 인사 + 오늘 할 일 단일 CTA + 진행 요약 ── */}
      <section className="from-primary/12 border-primary/15 via-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              {hero.eyebrow}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              {t.greeting.replace("{name}", user.name ?? user.email)}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatLongDate(new Date(), locale, user.timezone)}
            </p>
          </div>
          <OnboardingLauncher
            needsTutorial={onboarding.needsTutorial}
            isGuest={onboarding.isGuest}
          />
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="bg-primary/15 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <hero.Icon className="size-5" />
            </span>
            <div>
              <p className="text-base font-semibold">{hero.title}</p>
              <p className="text-muted-foreground text-sm">{hero.desc}</p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0" data-icon="inline-end">
            <Link href={hero.href}>
              {hero.cta}
              <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-0.5" />
            </Link>
          </Button>
        </div>

        {/* 진행 요약: 스트릭 + 오늘 진행률 */}
        <div className="border-primary/10 mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:max-w-md">
          <div className="flex items-center gap-2.5">
            <Flame className="text-warning size-5 shrink-0" />
            <div>
              <p className="text-lg leading-none font-semibold tabular-nums">
                {streak}
                {t.streakUnit}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{t.streakLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ListChecks className="text-success size-5 shrink-0" />
            <div>
              <p className="text-lg leading-none font-semibold tabular-nums">
                {progressPercent}%
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">{t.progressLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 오늘의 학습 (1차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t.sectionTodayLearning}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div data-tour="daily-mission">
            <DailyMissionCard board={missionBoard} />
          </div>
          <div data-tour="weak-problems">
            <WeakProblemsCard board={weakProblemBoard} />
          </div>
        </div>
        <StudyTimerCard
          todaySeconds={todaySeconds}
          activeStartedAt={activeSession ? activeSession.startedAt.toISOString() : null}
        />
        <WeeklyTrendMiniCard stats={weeklyStats} t={messages.stats} locale={locale} />
      </section>

      {/* ── 오늘의 계획 (2차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t.sectionTodayPlan}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <TodayGoalsCard goals={goals} subjects={subjects} t={messages.goals} />
          <TodayTodosCard todos={todos} t={messages.todos} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <RecommendedProblemsCard problems={recentProblems} />
          <div data-tour="today-review">
            <TodayReviewCard wrongAnswers={dueReviews} totalCount={dueCount} />
          </div>
          <TodayMockExamCard exams={recentExams} />
        </div>
      </section>

      {/* ── 학습 분석 (2차) — AI 서술형 분석(약점 분석/주간 리포트)은 /stats로 이동
          (Product Audit: 같은 "얼마나 잘하고 있나" 질문에 답하는 카드 3개가 대시보드에
          중복되어 있었음). 여기는 즉시 계산되는 사실 기반 데이터만 남긴다. ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t.sectionAnalysis}
        </h2>
        <div data-tour="weakness">
          <WeaknessCard units={topWeaknesses} />
        </div>
      </section>

      {/* Ads only for trial-active users. 학습 흐름을 끊지 않도록 대시보드 최하단으로 분리. */}
      <AdSlot placement="dashboard" show={showAds} />
    </div>
  );
}
