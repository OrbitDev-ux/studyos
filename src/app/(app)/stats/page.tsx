import { Clock, Flame, ListChecks } from "lucide-react";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { SubjectBreakdownCard } from "@/features/statistics/components/subject-breakdown-card";
import {
  getTodaySubjectBreakdown,
  getTodayTodoCounts,
} from "@/features/statistics/queries";
import { getStreak, getTodayStudySeconds } from "@/features/study-sessions/queries";
import { formatDurationKorean } from "@/lib/format";
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">통계</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="오늘 공부시간"
          value={formatDurationKorean(todaySeconds)}
          icon={Clock}
        />
        <StatCard
          label="완료한 Todo"
          value={`${completedCount}/${totalCount}`}
          icon={ListChecks}
        />
        <StatCard label="연속 공부일" value={`${streak}일`} icon={Flame} />
      </div>

      <SubjectBreakdownCard breakdown={breakdown} />
    </div>
  );
}
