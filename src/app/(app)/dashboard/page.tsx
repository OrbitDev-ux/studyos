import Link from "next/link";
import { ArrowRight, Flame, ListChecks, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginExperience } from "@/features/login-experience/login-experience";
import { WeaknessSummaryCard } from "@/features/ai/components/weakness-summary-card";
import { WeeklyReportCard } from "@/features/ai/components/weekly-report-card";
import { getLatestAiAnalysis } from "@/features/ai/queries";
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
import { getSubjects } from "@/features/subjects/queries";
import { TodayTodosCard } from "@/features/todos/components/today-todos-card";
import { getTodayTodos } from "@/features/todos/queries";
import { formatKoreanDate } from "@/lib/date";
import { requireCurrentUser } from "@/lib/session";

// generateWeaknessAnalysis/generateWeeklyReport's AI calls regularly run
// past Vercel's default serverless timeout — Server Actions inherit the
// invoking route's maxDuration.
export const maxDuration = 60;

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
    weaknessAnalysis,
    weeklyReport,
    recentProblems,
    dueReviews,
    dueCount,
    recentExams,
    topWeaknesses,
    missionBoard,
    weakProblemBoard,
    onboarding,
    planSummary,
  ] = await Promise.all([
    getActiveStudySession(user.id),
    getTodayStudySeconds(user.id, user.timezone),
    getStreak(user.id, user.timezone),
    getTodayGoals(user.id, user.timezone),
    getTodayTodos(user.id, user.timezone),
    getSubjects(user.id),
    getLatestAiAnalysis(user.id, "weakness"),
    getLatestAiAnalysis(user.id, "weekly-report"),
    getRecentProblems(user.id, CARD_PREVIEW_LIMIT),
    getDueReviews(user.id, CARD_PREVIEW_LIMIT),
    getDueReviewCount(user.id),
    getRecentMockExams(user.id, CARD_PREVIEW_LIMIT),
    getTopWeaknesses(user.id, 5),
    getDailyMissionBoard(user.id, user.timezone),
    getWeakProblemBoard(user.id, user.timezone),
    getOnboardingState(user.id),
    getPlanSummary(user.id),
  ]);
  const showAds = adsVisibleFor(user);

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent =
    todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 100);

  // 히어로 CTA는 "지금 무엇을 해야 하는가"를 하나로 압축한다.
  // 복습 대기가 있으면 최우선(망각 곡선), 없으면 오늘 학습 시작으로 유도.
  const hero =
    dueCount > 0
      ? {
          eyebrow: "오늘의 우선순위",
          title: `복습 대기 ${dueCount}개`,
          desc: "기억이 사라지기 전에 지금 복습하면 가장 효율적이에요.",
          cta: "지금 복습하기",
          href: "/review",
          Icon: NotebookPen,
        }
      : {
          eyebrow: "오늘의 학습",
          title: "새 문제로 감을 이어가요",
          desc: "추천 문제를 풀며 오늘의 연속 기록을 이어가세요.",
          cta: "문제 풀러 가기",
          href: "/problems",
          Icon: Sparkles,
        };

  return (
    <div className="flex flex-col gap-8">
      <LoginExperience role="user" />

      <TrialBanner summary={planSummary} />

      {/* ── HERO: 인사 + 오늘 할 일 단일 CTA + 진행 요약 ── */}
      <section className="from-primary/12 border-primary/15 relative overflow-hidden rounded-2xl border bg-gradient-to-br via-primary/5 to-transparent p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              {hero.eyebrow}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              안녕하세요, {user.name ?? user.email}님
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatKoreanDate(new Date(), user.timezone)}
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
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary/10 pt-4 sm:max-w-md">
          <div className="flex items-center gap-2.5">
            <Flame className="text-warning size-5 shrink-0" />
            <div>
              <p className="text-lg leading-none font-semibold tabular-nums">{streak}일</p>
              <p className="text-muted-foreground mt-0.5 text-xs">연속 공부일</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <ListChecks className="text-success size-5 shrink-0" />
            <div>
              <p className="text-lg leading-none font-semibold tabular-nums">
                {progressPercent}%
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">오늘 진행률</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 오늘의 학습 (1차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          오늘의 학습
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
      </section>

      {/* ── 오늘의 계획 (2차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          오늘의 계획
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <TodayGoalsCard goals={goals} subjects={subjects} />
          <TodayTodosCard todos={todos} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <RecommendedProblemsCard problems={recentProblems} />
          <div data-tour="today-review">
            <TodayReviewCard wrongAnswers={dueReviews} totalCount={dueCount} />
          </div>
          <TodayMockExamCard exams={recentExams} />
        </div>
      </section>

      {/* ── 분석 & 리포트 (2차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          분석 & 리포트
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div data-tour="weakness">
            <WeaknessCard units={topWeaknesses} />
          </div>
          <WeaknessSummaryCard initialContent={weaknessAnalysis?.content ?? null} />
          <WeeklyReportCard initialContent={weeklyReport?.content ?? null} />
        </div>
      </section>

      {/* Ads only for trial-active users. 학습 흐름을 끊지 않도록 대시보드 최하단으로 분리. */}
      <AdSlot placement="dashboard" show={showAds} />
    </div>
  );
}
