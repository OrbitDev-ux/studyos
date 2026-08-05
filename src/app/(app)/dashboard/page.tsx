import { Flame, ListChecks } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { TodayGoalsCard } from "@/features/goals/components/today-goals-card";
import { getTodayGoals } from "@/features/goals/queries";
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

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  const [activeSession, todaySeconds, streak, goals, todos, subjects] = await Promise.all([
    getActiveStudySession(user.id),
    getTodayStudySeconds(user.id, user.timezone),
    getStreak(user.id, user.timezone),
    getTodayGoals(user.id, user.timezone),
    getTodayTodos(user.id, user.timezone),
    getSubjects(user.id),
  ]);

  const completedTodos = todos.filter((todo) => todo.completed).length;
  const progressPercent =
    todos.length === 0 ? 0 : Math.round((completedTodos / todos.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          안녕하세요, {user.name ?? user.email}님
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {formatKoreanDate(new Date(), user.timezone)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="오늘 진행률" value={`${progressPercent}%`} icon={ListChecks} />
        <StatCard label="연속 공부일" value={`${streak}일`} icon={Flame} />
      </div>

      <StudyTimerCard
        todaySeconds={todaySeconds}
        activeStartedAt={activeSession ? activeSession.startedAt.toISOString() : null}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayGoalsCard goals={goals} subjects={subjects} />
        <TodayTodosCard todos={todos} />
      </div>
    </div>
  );
}
