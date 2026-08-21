/**
 * Level curve — pure functions only, no DB access, so server and client
 * always compute the identical level/progress from the same totalXp (Server
 * Actions/queries return totalXp; any client rendering re-derives the rest).
 *
 * Curve: level L requires `L * XP_PER_LEVEL_STEP` XP to CLEAR (level 1→2
 * needs 100, 2→3 needs 200, ...), so the cumulative XP to REACH level L is
 * the triangular number `XP_PER_LEVEL_STEP * (L-1) * L / 2`. Simple and
 * predictable (each level is a fixed, growing step), and cheap to invert in
 * closed form — no loop over arbitrarily large XP.
 */

export const XP_PER_LEVEL_STEP = 100;
export const MIN_LEVEL = 1;

/** XP needed to clear `level` and reach `level + 1`. */
export function xpRequiredForLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.floor(level)) * XP_PER_LEVEL_STEP;
}

/** Cumulative XP needed to REACH `level` (i.e. to have already cleared every
 * level below it). totalXpForLevel(1) === 0 — everyone starts at level 1. */
export function totalXpForLevel(level: number): number {
  const l = Math.max(MIN_LEVEL, Math.floor(level));
  return (XP_PER_LEVEL_STEP * (l - 1) * l) / 2;
}

/**
 * The level a given totalXp corresponds to. Closed-form inverse of
 * totalXpForLevel (solving the triangular-number quadratic for L), with a
 * small correction step for floating-point rounding at the boundary — O(1)
 * regardless of how large totalXp is, never an unbounded loop.
 */
export function getLevelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  const estimate = Math.floor(
    (1 + Math.sqrt(1 + (8 * xp) / XP_PER_LEVEL_STEP)) / 2,
  );
  let level = Math.max(MIN_LEVEL, estimate);
  while (totalXpForLevel(level + 1) <= xp) level++;
  while (level > MIN_LEVEL && totalXpForLevel(level) > xp) level--;
  return level;
}

export type LevelProgress = {
  level: number;
  totalXp: number;
  /** XP earned within the current level (0 <= currentLevelXp < xpForNextLevel). */
  currentLevelXp: number;
  /** XP needed to clear the current level. */
  xpForNextLevel: number;
  /** currentLevelXp / xpForNextLevel, clamped to [0, 1]. */
  progressRatio: number;
};

/** Full progress breakdown for display (e.g. "1,240 / 1,500 XP" + a bar). */
export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = getLevelFromXp(xp);
  const levelStartXp = totalXpForLevel(level);
  const xpForNextLevel = xpRequiredForLevel(level);
  const currentLevelXp = xp - levelStartXp;
  const progressRatio =
    xpForNextLevel > 0 ? Math.min(1, Math.max(0, currentLevelXp / xpForNextLevel)) : 0;
  return { level, totalXp: xp, currentLevelXp, xpForNextLevel, progressRatio };
}
