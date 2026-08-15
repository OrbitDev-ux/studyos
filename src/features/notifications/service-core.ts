import type { NotificationCategory, NotificationPreferences } from "@/features/notifications/types";

/**
 * Pure logic split out of service.ts (which touches Prisma) so it is
 * directly unit-testable without a database — mirrors the `-core.ts`
 * extraction pattern used in features/dev for the same reason.
 */

/** Opt-out semantics: only an explicit `false` disables a category: any other
 * value (missing key, null prefs, non-boolean) is treated as enabled. */
export function isCategoryEnabled(
  prefs: NotificationPreferences | null | undefined,
  category: NotificationCategory,
): boolean {
  if (!prefs) return true;
  return prefs[category] !== false;
}

/** Splits an array into fixed-size batches — bulk notification inserts go
 * through this so one broadcast never becomes a single unbounded query. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be positive");
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/** The one security invariant every mutation must uphold: a notification can
 * only ever be acted on by the user it belongs to. Kept as a named function
 * (not inlined) so it reads as a checked invariant, not an incidental filter. */
export function isOwnedBy(notificationUserId: string, requesterId: string): boolean {
  return notificationUserId === requesterId;
}
