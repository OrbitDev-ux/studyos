import "server-only";
import { prisma } from "@/lib/prisma";
import { getWeaknessBreakdown } from "@/features/learning/weakness";

/**
 * Minimal, PII-free learning signal passed to the book generator. Reuses the
 * existing Weakness engine and Wrong-Answer DNA data — no new analysis system.
 * Only unit names + accuracy + error concepts are included; NO email, tokens,
 * IP, or any personal identifiers ever reach the AI.
 */
export type StudyBookLearningContext = {
  weakness: { unit: string; accuracyPercent: number }[];
  wrongConcepts: string[];
};

export async function getStudyBookLearningContext(
  userId: string,
  subjectId: string | null,
): Promise<StudyBookLearningContext> {
  const [units, dnaRows] = await Promise.all([
    getWeaknessBreakdown(userId),
    prisma.wrongAnswer.findMany({
      where: { userId, resolved: false, errorConcept: { not: null } },
      select: { errorConcept: true },
      take: 30,
    }),
  ]);

  const scoped = subjectId ? units.filter((u) => u.subjectId === subjectId) : units;
  const weakness = scoped
    .filter((u) => u.attempts >= 1)
    .slice(0, 5)
    .map((u) => ({ unit: u.unit, accuracyPercent: u.overallAccuracy }));

  const wrongConcepts = [
    ...new Set(dnaRows.map((r) => r.errorConcept).filter((c): c is string => !!c)),
  ].slice(0, 8);

  return { weakness, wrongConcepts };
}
