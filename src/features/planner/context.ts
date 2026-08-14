import "server-only";
import { prisma } from "@/lib/prisma";
import { getTopWeaknesses } from "@/features/learning/weakness";
import { getDueReviews, getDueReviewCount } from "@/features/review/queries";
import { getRecentRange } from "@/lib/date";

export type PlannerContext = {
  weakUnits: { subject: string; unit: string; accuracyPercent: number }[];
  dueReviewConcepts: { subject: string; unit: string | null }[];
  dueReviewCount: number;
  recentStudyMinutes: number;
  problemsSolvedTotal: number;
};

/**
 * Minimal learning signals for the planner (§9, §15) — reuses Weakness
 * Analysis, Spaced-Repetition due data, and study/attempt aggregates. No PII
 * (email/token/IP/internal ids) is ever included; free-form text is truncated.
 */
export async function buildPlannerContext(
  userId: string,
  timezone: string,
): Promise<PlannerContext> {
  const { start, end } = getRecentRange(timezone, 7);

  const [weak, due, dueReviewCount, recentAgg, problemsSolvedTotal] = await Promise.all([
    getTopWeaknesses(userId, 8),
    getDueReviews(userId, 8),
    getDueReviewCount(userId),
    prisma.studySession.aggregate({
      where: { userId, startedAt: { gte: start, lt: end } },
      _sum: { durationSec: true },
    }),
    prisma.problemAttempt.count({ where: { userId } }),
  ]);

  const seen = new Set<string>();
  const dueReviewConcepts: PlannerContext["dueReviewConcepts"] = [];
  for (const d of due) {
    const subject = d.problem.subject?.name ?? "";
    const unit = d.problem.unit ?? null;
    const key = `${subject}::${unit ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dueReviewConcepts.push({ subject, unit });
  }

  return {
    weakUnits: weak
      .slice(0, 5)
      .map((w) => ({
        subject: w.subjectName,
        unit: w.unit,
        accuracyPercent: Math.round(w.overallAccuracy),
      })),
    dueReviewConcepts,
    dueReviewCount,
    recentStudyMinutes: Math.round((recentAgg._sum.durationSec ?? 0) / 60),
    problemsSolvedTotal,
  };
}
