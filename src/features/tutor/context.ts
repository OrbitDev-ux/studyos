import "server-only";
import { getTopWeaknesses } from "@/features/learning/weakness";
import { getDueReviews } from "@/features/review/queries";
import { tutorSubjectLabel } from "@/features/tutor/config";

export type TutorContext = {
  subject: string;
  grade: string;
  weakUnits: { unit: string; accuracyPercent: number }[];
  recentWrong: string[];
};

/**
 * TutorContextBuilder — assembles ONLY the minimal learning signals the tutor
 * needs (§7, §11), scoped to the conversation's subject. Reuses the existing
 * Weakness Analysis (getTopWeaknesses) and Wrong Answer / Spaced-Repetition data
 * (getDueReviews); no new analytics system. Never includes PII
 * (email/token/IP/etc.).
 */
export async function buildTutorContext(
  userId: string,
  subjectId: string,
  gradeGuidanceLabel: string,
): Promise<TutorContext> {
  const subjectLabel = tutorSubjectLabel(subjectId);
  const [weak, due] = await Promise.all([
    getTopWeaknesses(userId, 8),
    getDueReviews(userId, 8),
  ]);

  return {
    subject: subjectLabel,
    grade: gradeGuidanceLabel,
    weakUnits: weak
      .filter((w) => w.subjectName === subjectLabel)
      .slice(0, 4)
      .map((w) => ({ unit: w.unit, accuracyPercent: Math.round(w.overallAccuracy) })),
    recentWrong: due
      .filter((d) => d.problem.subject?.name === subjectLabel)
      .slice(0, 3)
      // Truncate so a long/user-authored prompt can't bloat or steer the model.
      .map((d) => d.problem.prompt.slice(0, 100)),
  };
}
