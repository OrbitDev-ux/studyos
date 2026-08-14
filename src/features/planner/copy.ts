import type { Locale } from "@/features/i18n/config";

/** Planner UI copy keyed by resolved locale (colocated with the feature, like
 * achievements). Uses the same Locale so switching language switches this too. */
export type PlannerCopy = {
  open: string;
  dialogTitle: string;
  intro: string;
  goalLabel: string;
  goalPlaceholder: string;
  examDaysLabel: string;
  examDaysPlaceholder: string;
  generate: string;
  generating: string;
  planTitle: string;
  minutes: string; // "{minutes}m"
  addToTodos: string;
  adding: string;
  added: string; // "{count} added"
  error: string;
};

export const PLANNER_COPY: Record<Locale, PlannerCopy> = {
  "ko-KR": {
    open: "AI 학습 계획",
    dialogTitle: "AI 학습 계획",
    intro: "내 학습 데이터를 바탕으로 오늘의 학습 계획을 만들어드려요.",
    goalLabel: "학습 목표 (선택)",
    goalPlaceholder: "예: 이번 중간고사 대비",
    examDaysLabel: "시험까지 남은 일수 (선택)",
    examDaysPlaceholder: "예: 14",
    generate: "계획 생성",
    generating: "생성 중...",
    planTitle: "오늘의 학습",
    minutes: "{minutes}분",
    addToTodos: "오늘 할 일에 추가",
    adding: "추가 중...",
    added: "{count}개를 오늘 할 일에 추가했어요.",
    error: "학습 계획 생성에 실패했어요. 잠시 후 다시 시도해주세요.",
  },
  "en-US": {
    open: "AI study plan",
    dialogTitle: "AI study plan",
    intro: "We'll build today's study plan from your own learning data.",
    goalLabel: "Goal (optional)",
    goalPlaceholder: "e.g. Prep for the midterm",
    examDaysLabel: "Days until exam (optional)",
    examDaysPlaceholder: "e.g. 14",
    generate: "Generate plan",
    generating: "Generating...",
    planTitle: "Today's study",
    minutes: "{minutes}m",
    addToTodos: "Add to today's todos",
    adding: "Adding...",
    added: "Added {count} to today's todos.",
    error: "Couldn't generate a plan. Please try again shortly.",
  },
  "ja-JP": {
    open: "AI学習プラン",
    dialogTitle: "AI学習プラン",
    intro: "あなたの学習データから今日の学習プランを作成します。",
    goalLabel: "学習目標（任意）",
    goalPlaceholder: "例: 中間試験の対策",
    examDaysLabel: "試験までの日数（任意）",
    examDaysPlaceholder: "例: 14",
    generate: "プランを作成",
    generating: "作成中...",
    planTitle: "今日の学習",
    minutes: "{minutes}分",
    addToTodos: "今日のToDoに追加",
    adding: "追加中...",
    added: "{count}件を今日のToDoに追加しました。",
    error: "学習プランの作成に失敗しました。しばらくしてからお試しください。",
  },
  "zh-CN": {
    open: "AI 学习计划",
    dialogTitle: "AI 学习计划",
    intro: "根据你的学习数据生成今天的学习计划。",
    goalLabel: "学习目标（可选）",
    goalPlaceholder: "例：备考期中考试",
    examDaysLabel: "距离考试天数（可选）",
    examDaysPlaceholder: "例：14",
    generate: "生成计划",
    generating: "生成中...",
    planTitle: "今日学习",
    minutes: "{minutes}分钟",
    addToTodos: "加入今日待办",
    adding: "添加中...",
    added: "已将 {count} 项加入今日待办。",
    error: "生成学习计划失败，请稍后再试。",
  },
};

export function getPlannerCopy(locale: Locale): PlannerCopy {
  return PLANNER_COPY[locale];
}
