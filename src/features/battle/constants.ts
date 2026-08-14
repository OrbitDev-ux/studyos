import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import { formatDuration } from "@/lib/format";

export const BATTLE_METRICS = ["study_time", "todo_count", "goal_progress"] as const;
export type BattleMetric = (typeof BATTLE_METRICS)[number];

export const BATTLE_DURATION_DAYS = ["1", "3", "7"] as const;

/** Localized label for a battle metric (falls back to the raw value). */
export function battleMetricLabel(t: Messages["battle"], metric: string): string {
  const map: Record<BattleMetric, string> = {
    study_time: t.metricStudyTime,
    todo_count: t.metricTodoCount,
    goal_progress: t.metricGoalProgress,
  };
  return map[metric as BattleMetric] ?? metric;
}

/** Localized label for a battle duration in days (falls back to the raw value). */
export function battleDurationLabel(t: Messages["battle"], days: string): string {
  const map: Record<string, string> = {
    "1": t.duration1,
    "3": t.duration3,
    "7": t.duration7,
  };
  return map[days] ?? days;
}

export function formatBattleScore(metric: string, score: number, locale: Locale): string {
  if (metric === "study_time") return formatDuration(score, locale);
  if (metric === "todo_count") return `${score}`;
  return `${score}%`;
}
