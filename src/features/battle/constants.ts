import { formatDurationKorean } from "@/lib/format";

export const BATTLE_METRICS = ["study_time", "todo_count", "goal_progress"] as const;
export type BattleMetric = (typeof BATTLE_METRICS)[number];

export const BATTLE_METRIC_LABEL: Record<BattleMetric, string> = {
  study_time: "공부시간",
  todo_count: "Todo 완료",
  goal_progress: "목표 달성률",
};

export const BATTLE_DURATION_DAYS = ["1", "3", "7"] as const;

export const BATTLE_DURATION_LABEL: Record<string, string> = {
  "1": "24시간",
  "3": "3일",
  "7": "7일",
};

export function formatBattleScore(metric: string, score: number): string {
  if (metric === "study_time") return formatDurationKorean(score);
  if (metric === "todo_count") return `${score}개`;
  return `${score}%`;
}
