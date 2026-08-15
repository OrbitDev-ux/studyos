import { z } from "zod";
import { NOTIFICATION_CATEGORIES, type NotificationPreferences } from "@/features/notifications/types";

/**
 * Notification preferences whitelist (§6/§31-style: only these four named,
 * bounded keys — never arbitrary client JSON). `.strict()` rejects any key
 * outside this shape.
 */
export const notificationPreferencesSchema = z
  .object(Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, z.boolean()])) as Record<
    (typeof NOTIFICATION_CATEGORIES)[number],
    z.ZodBoolean
  >)
  .partial()
  .strict();

/** Parses stored/incoming preferences JSON against the whitelist, dropping
 * any invalid/unknown keys — never trusts stored JSON shape blindly. Pure
 * (no DB/IO) so it's directly unit-testable independent of Prisma. Missing
 * keys stay missing (not defaulted to true/false here) — `isCategoryEnabled`
 * in service-core.ts is what defines "missing = enabled". */
export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}
