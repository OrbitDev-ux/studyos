/**
 * Achievement definitions — config-driven so a new badge is one entry here plus
 * its copy in `copy.ts`. Conditions are pure predicates over LearningStats
 * (computed server-side from existing learning data), so a badge is *earned* by
 * real activity only; nothing is stored or client-trusted. Adding a badge never
 * touches the DB.
 */

export type AchievementCategory = "study" | "problem" | "review" | "weakness";

export type AchievementId =
  | "FIRST_STUDY"
  | "STUDY_STREAK_3"
  | "STUDY_STREAK_7"
  | "STUDY_STREAK_30"
  | "FIRST_PROBLEM"
  | "PROBLEM_10"
  | "PROBLEM_100"
  | "PERFECT_10"
  | "FIRST_REVIEW"
  | "REVIEW_30"
  | "REVIEW_MASTER"
  | "WEAKNESS_OVERCOME"
  | "WRONG_ANSWER_RECOVERY";

/** Aggregates derived from existing tables — no duplicate learning record. */
export type LearningStats = {
  studySessions: number;
  studyStreak: number;
  problemsSolved: number;
  bestCorrectStreak: number;
  reviewsCompleted: number;
  reviewsGraduated: number;
  totalWrongAnswers: number;
  dueReviews: number;
};

export type AchievementDefinition = {
  id: AchievementId;
  category: AchievementCategory;
  /** Locale-neutral emoji badge. */
  icon: string;
  condition: (s: LearningStats) => boolean;
};

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: "FIRST_STUDY", category: "study", icon: "🌱", condition: (s) => s.studySessions >= 1 },
  { id: "STUDY_STREAK_3", category: "study", icon: "🔥", condition: (s) => s.studyStreak >= 3 },
  { id: "STUDY_STREAK_7", category: "study", icon: "🔥", condition: (s) => s.studyStreak >= 7 },
  { id: "STUDY_STREAK_30", category: "study", icon: "🏆", condition: (s) => s.studyStreak >= 30 },
  { id: "FIRST_PROBLEM", category: "problem", icon: "✏️", condition: (s) => s.problemsSolved >= 1 },
  { id: "PROBLEM_10", category: "problem", icon: "📝", condition: (s) => s.problemsSolved >= 10 },
  { id: "PROBLEM_100", category: "problem", icon: "💯", condition: (s) => s.problemsSolved >= 100 },
  { id: "PERFECT_10", category: "problem", icon: "🎯", condition: (s) => s.bestCorrectStreak >= 10 },
  { id: "FIRST_REVIEW", category: "review", icon: "🔁", condition: (s) => s.reviewsCompleted >= 1 },
  { id: "REVIEW_30", category: "review", icon: "📚", condition: (s) => s.reviewsCompleted >= 30 },
  {
    id: "REVIEW_MASTER",
    category: "review",
    icon: "🧠",
    condition: (s) => s.totalWrongAnswers >= 1 && s.dueReviews === 0,
  },
  {
    id: "WEAKNESS_OVERCOME",
    category: "weakness",
    icon: "💪",
    condition: (s) => s.reviewsGraduated >= 3,
  },
  {
    id: "WRONG_ANSWER_RECOVERY",
    category: "weakness",
    icon: "🛡️",
    condition: (s) => s.reviewsGraduated >= 10,
  },
] as const;

/** Longest run of consecutive `true` in order — the "N in a row" streak. */
export function longestTrueRun(flags: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const flag of flags) {
    run = flag ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

export function evaluateAchievements(
  stats: LearningStats,
): { id: AchievementId; category: AchievementCategory; icon: string; earned: boolean }[] {
  return ACHIEVEMENTS.map((def) => ({
    id: def.id,
    category: def.category,
    icon: def.icon,
    earned: def.condition(stats),
  }));
}
