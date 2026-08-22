import { ClipboardList, Flame, GraduationCap, ListChecks, MessageCircle, NotebookPen } from "lucide-react";
import { LoginExperience } from "@/features/login-experience/login-experience";
import { ContinueWorkingCard, type ContinueItem } from "@/features/dashboard/components/continue-working-card";
import { QuickApps } from "@/features/dashboard/components/quick-apps";
import { RecentActivityCard } from "@/features/dashboard/components/recent-activity-card";
import { FriendsPresenceCard } from "@/features/dashboard/components/friends-presence-card";
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
import { GrowthMissionCard } from "@/features/growth/components/growth-mission-card";
import { getActiveMissions } from "@/features/growth/mission-queries";
import { WeakProblemsCard } from "@/features/learning/components/weak-problems-card";
import { getWeakProblemBoard } from "@/features/learning/weak-problems-queries";
import { MilestoneBanner } from "@/features/announcements/components/milestone-banner";
import { getHeaderNotifications } from "@/features/notifications/queries";
import { OnboardingLauncher } from "@/features/onboarding/components/onboarding-launcher";
import { getOnboardingState } from "@/features/onboarding/queries";
import { TrialBanner } from "@/features/billing/components/trial-banner";
import { getPlanSummary } from "@/features/billing/usage";
import { adsVisibleFor } from "@/features/billing/access";
import { AdSlot } from "@/features/ads/components/ad-slot";
import { getFriends, getConversations, getReceivedFriendRequestCount } from "@/features/social/queries";
import {
  getActiveStudySession,
  getStreak,
  getTodayStudySeconds,
} from "@/features/study-sessions/queries";
import { StudyTimerCard } from "@/features/study-sessions/components/study-timer-card";
import { WeeklyTrendMiniCard } from "@/features/statistics/components/weekly-trend-mini-card";
import { getWeeklyStatistics } from "@/features/statistics/queries";
import { getSubjects } from "@/features/subjects/queries";
import { getTutorConversations } from "@/features/tutor/queries";
import { TodayTodosCard } from "@/features/todos/components/today-todos-card";
import { getTodayTodos } from "@/features/todos/queries";
import { formatLongDate } from "@/lib/date";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const CARD_PREVIEW_LIMIT = 3;
const CONTINUE_ITEM_LIMIT = 3;

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
    activeMissions,
    tutorConversations,
    conversations,
    friends,
    pendingRequestCount,
    headerNotifications,
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
    getActiveMissions(user.id),
    getTutorConversations(user.id),
    getConversations(user.id),
    getFriends(user.id),
    getReceivedFriendRequestCount(user.id),
    getHeaderNotifications(user.id),
  ]);
  const showAds = adsVisibleFor(user);
  const locale = await getServerLocale(user.locale);
  const messages = getMessages(locale);
  const t = messages.dashboard;

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent =
    todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 100);

  // "이어서 하기": real, already-fetched signals only, in priority order —
  // never a fabricated "recently used app" list. An active study session
  // isn't included here even though it's a real signal: the timer it would
  // link to is already on this very page (StudyTimerCard below), so a tile
  // for it would just be a link back to itself.
  const unreadConversation = conversations.find((c) => c.unreadCount > 0);
  const incompleteExam = recentExams.find((exam) => exam.results.length === 0);
  const continueItems: ContinueItem[] = [
    dueCount > 0
      ? {
          key: "review",
          icon: NotebookPen,
          title: t.continueReview,
          desc: t.continueReviewDesc.replace("{count}", String(dueCount)),
          href: "/review",
        }
      : null,
    tutorConversations[0]
      ? {
          key: "tutor",
          icon: GraduationCap,
          title: t.continueTutor,
          desc: tutorConversations[0].title,
          href: `/tutor/${tutorConversations[0].id}`,
        }
      : null,
    unreadConversation
      ? {
          key: "messenger",
          icon: MessageCircle,
          title: t.continueMessenger,
          desc: t.continueMessengerUnread.replace(
            "{count}",
            String(unreadConversation.unreadCount),
          ),
          href: `/social/${unreadConversation.id}`,
        }
      : null,
    incompleteExam
      ? {
          key: "mock-exam",
          icon: ClipboardList,
          title: t.continueMockExam,
          desc: incompleteExam.title,
          href: `/mock-exam/${incompleteExam.id}`,
        }
      : null,
  ]
    .filter((item) => item != null)
    .slice(0, CONTINUE_ITEM_LIMIT);

  return (
    <div className="flex flex-col gap-8 md:gap-9">
      <LoginExperience role="user" />

      <MilestoneBanner />

      <TrialBanner summary={planSummary} />

      {/* ── 인사 + 핵심 지표: 카드/그라디언트 없이 컴팩트하게 ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t.greeting.replace("{name}", () => user.name ?? user.email)}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatLongDate(new Date(), locale, user.timezone)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="text-warning size-4 shrink-0" aria-hidden />
            <span className="text-sm font-semibold tabular-nums">
              {streak}
              {t.streakUnit}
            </span>
            <span className="text-muted-foreground text-xs">{t.streakLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ListChecks className="text-success size-4 shrink-0" aria-hidden />
            <span className="text-sm font-semibold tabular-nums">{progressPercent}%</span>
            <span className="text-muted-foreground text-xs">{t.progressLabel}</span>
          </div>
          <OnboardingLauncher
            needsTutorial={onboarding.needsTutorial}
            isGuest={onboarding.isGuest}
          />
        </div>
      </div>

      <ContinueWorkingCard items={continueItems} t={t} />

      <QuickApps messages={messages} />

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentActivityCard initial={headerNotifications} messages={messages} />
        <FriendsPresenceCard
          friends={friends}
          pendingRequestCount={pendingRequestCount}
          messages={messages}
        />
      </div>

      {/* ── 오늘의 학습 (1차) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t.sectionTodayLearning}
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
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
        <div className="grid gap-5 lg:grid-cols-2">
          <TodayGoalsCard goals={goals} subjects={subjects} t={messages.goals} />
          <TodayTodosCard todos={todos} t={messages.todos} />
        </div>
        <div data-tour="growth-mission">
          <GrowthMissionCard missions={activeMissions} subjects={subjects} t={messages.growth} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
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
