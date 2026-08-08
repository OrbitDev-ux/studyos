import { Flame, ListChecks } from "lucide-react";
import { LoginExperience } from "@/features/login-experience/login-experience";
import { WeaknessSummaryCard } from "@/features/ai/components/weakness-summary-card";
import { WeeklyReportCard } from "@/features/ai/components/weekly-report-card";
import { getLatestAiAnalysis } from "@/features/ai/queries";
import { StatCard } from "@/features/dashboard/components/stat-card";
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
  ]);

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent =
    todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <LoginExperience role="user" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="오늘 진행률" value={`${progressPercent}%`} icon={ListChecks} />
        <StatCard label="연속 공부일" value={`${streak}일`} icon={Flame} />
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <div data-tour="weakness">
          <WeaknessCard units={topWeaknesses} />
        </div>
        <WeaknessSummaryCard initialContent={weaknessAnalysis?.content ?? null} />
        <WeeklyReportCard initialContent={weeklyReport?.content ?? null} />
      </div>
    </div>
  );
}
