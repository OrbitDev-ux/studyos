import "server-only";
import { getTopWeaknesses } from "@/features/learning/weakness";
import { getRecentProblems } from "@/features/problems/queries";
import { getDueReviewCount } from "@/features/review/queries";
import { rankNextLearning, type NextLearningItem } from "@/features/lab/rank";

export type { NextLearningItem } from "@/features/lab/rank";

export async function getNextLearning(
  userId: string,
): Promise<{ items: NextLearningItem[]; empty: boolean }> {
  const [weak, dueCount, recent] = await Promise.all([
    getTopWeaknesses(userId, 5),
    getDueReviewCount(userId),
    getRecentProblems(userId, 3),
  ]);
  const items = rankNextLearning({
    dueReviewCount: dueCount,
    weak: weak.map((w) => ({
      subjectName: w.subjectName,
      unit: w.unit,
      accuracyPercent: Math.round(w.overallAccuracy),
      band: w.band,
    })),
    recentSubjects: recent.map((p) => p.subject?.name).filter((s): s is string => !!s),
  });
  return { items, empty: items.length === 0 };
}
