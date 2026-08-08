import { prisma } from "@/lib/prisma";
import {
  computeWeaknessUnits,
  type AttemptRow,
  type WeaknessUnit,
} from "@/features/learning/weakness-compute";

export type {
  MasteryBand,
  WeaknessUnit,
  AttemptRow,
} from "@/features/learning/weakness-compute";

// Only the most recent slice of the log is needed to characterize current
// weakness; older attempts have near-zero recency weight anyway.
const MAX_ATTEMPTS = 1000;

/** Full per-unit weakness breakdown for a user, weakest first. Fetches the
 * attempt log + subject names, then delegates to the pure computeWeaknessUnits. */
export async function getWeaknessBreakdown(userId: string): Promise<WeaknessUnit[]> {
  const rows = (await prisma.problemAttempt.findMany({
    where: { userId },
    select: {
      subjectId: true,
      unit: true,
      isCorrect: true,
      createdAt: true,
      durationMs: true,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ATTEMPTS,
  })) as AttemptRow[];

  if (rows.length === 0) return [];

  const subjectIds = [
    ...new Set(rows.map((r) => r.subjectId).filter((id): id is string => !!id)),
  ];
  const subjects = subjectIds.length
    ? await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

  return computeWeaknessUnits(rows, subjectName);
}

/**
 * The top weak units for a compact surface (dashboard card). Prefers units with
 * enough signal (>= MIN_ATTEMPTS_FOR_CONFIDENCE) and non-green mastery; falls
 * back to whatever exists so a light user still sees something real.
 */
const MIN_ATTEMPTS_FOR_CONFIDENCE = 2;

export async function getTopWeaknesses(userId: string, limit: number): Promise<WeaknessUnit[]> {
  const all = await getWeaknessBreakdown(userId);
  const confident = all.filter(
    (u) => u.attempts >= MIN_ATTEMPTS_FOR_CONFIDENCE && u.band !== "GREEN",
  );
  const pool = confident.length > 0 ? confident : all;
  return pool.slice(0, limit);
}
