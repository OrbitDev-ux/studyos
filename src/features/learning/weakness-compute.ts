/**
 * Pure weakness-scoring core — no DB, no imports, fully deterministic so it can
 * be unit-tested in isolation. `weakness.ts` fetches the attempt log and calls
 * computeWeaknessUnits; nothing here touches Prisma or the network.
 *
 * Weakness is computed at read time from the ProblemAttempt log — no
 * stored/duplicated score, the same "derive don't cache" approach the rest of
 * the app uses for stats. Being free (no AI), it can run on every dashboard
 * load; the AI recommendation layer (Phase 9) consumes this output.
 */
export type MasteryBand = "RED" | "ORANGE" | "GREEN";

export type WeaknessUnit = {
  subjectId: string | null;
  subjectName: string;
  unit: string;
  attempts: number;
  correct: number;
  /** Plain lifetime accuracy 0–100. */
  overallAccuracy: number;
  /** Recency-weighted accuracy 0–100 (recent attempts count more). */
  mastery: number;
  band: MasteryBand;
  /** Consecutive most-recent wrong attempts — feeds weak-problem priority. */
  recentWrongStreak: number;
  avgDurationMs: number | null;
  lastAttemptAt: Date;
};

export type AttemptRow = {
  subjectId: string | null;
  unit: string | null;
  isCorrect: boolean;
  createdAt: Date;
  durationMs: number | null;
};

// Recency weighting: an attempt's contribution halves every HALF_LIFE_DAYS, so
// last week's performance dominates the mastery score over last month's.
const HALF_LIFE_DAYS = 7;
const HALF_LIFE_MS = HALF_LIFE_DAYS * 24 * 60 * 60 * 1000;
const UNSPECIFIED_UNIT = "미지정";

export function bandFor(mastery: number): MasteryBand {
  if (mastery < 50) return "RED";
  if (mastery < 80) return "ORANGE";
  return "GREEN";
}

/**
 * Compute per-unit weakness from an attempt log. `rows` must be newest-first
 * (as the query returns them). `now` is injectable for stable tests. Result is
 * sorted weakest (lowest mastery) first.
 */
export function computeWeaknessUnits(
  rows: AttemptRow[],
  subjectName: Map<string, string>,
  now: number = Date.now(),
): WeaknessUnit[] {
  if (rows.length === 0) return [];

  // Group by (subjectId, unit). Rows arrive newest-first, so each group's
  // array is already ordered most-recent-first.
  const groups = new Map<string, AttemptRow[]>();
  for (const row of rows) {
    const key = `${row.subjectId ?? ""}::${row.unit ?? ""}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row);
  }

  const units: WeaknessUnit[] = [];

  for (const group of groups.values()) {
    let weightSum = 0;
    let weightedCorrect = 0;
    let correct = 0;
    let durationSum = 0;
    let durationCount = 0;

    for (const row of group) {
      const ageMs = now - row.createdAt.getTime();
      const weight = Math.pow(0.5, Math.max(0, ageMs) / HALF_LIFE_MS);
      weightSum += weight;
      if (row.isCorrect) {
        weightedCorrect += weight;
        correct += 1;
      }
      if (row.durationMs != null) {
        durationSum += row.durationMs;
        durationCount += 1;
      }
    }

    // Leading (most-recent) consecutive wrongs.
    let recentWrongStreak = 0;
    for (const row of group) {
      if (row.isCorrect) break;
      recentWrongStreak += 1;
    }

    const mastery = weightSum > 0 ? Math.round((weightedCorrect / weightSum) * 100) : 0;
    const first = group[0]!;

    units.push({
      subjectId: first.subjectId,
      subjectName: first.subjectId
        ? (subjectName.get(first.subjectId) ?? "미지정 과목")
        : "미지정 과목",
      unit: first.unit ?? UNSPECIFIED_UNIT,
      attempts: group.length,
      correct,
      overallAccuracy: Math.round((correct / group.length) * 100),
      mastery,
      band: bandFor(mastery),
      recentWrongStreak,
      avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
      lastAttemptAt: first.createdAt,
    });
  }

  // Weakest first; ties broken by more recent wrong activity, then sample size.
  units.sort(
    (a, b) =>
      a.mastery - b.mastery ||
      b.recentWrongStreak - a.recentWrongStreak ||
      b.attempts - a.attempts,
  );

  return units;
}
