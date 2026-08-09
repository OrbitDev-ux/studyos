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

  const canAdvancedAnalytics = canUseFeature(accessStateFor(user), "ADVANCED_ANALYTICS");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">통계</h1>

      {!canAdvancedAnalytics && (
        <UpgradeNotice
          title="상세·고급 통계는 Pro 플랜에서 제공돼요"
          message="단원별 정답률, 성적 추세, 학습 시간 분석 등을 확인할 수 있어요."
          cta="Pro 알아보기"
        />
      )}

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
