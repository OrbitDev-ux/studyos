import type { BlockedIp } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * The single source of truth for "is this IP banned right now". A ban is in
 * effect when the row is active AND (permanent OR its expiry is still in the
 * future). Expired time-bans are treated as not-banned without needing a
 * cleanup job. Returns the ban row (for logging/reasons) or null.
 */
export async function findActiveBan(ip: string): Promise<BlockedIp | null> {
  if (!ip || ip === "unknown") return null;

  const ban = await prisma.blockedIp.findUnique({ where: { ip } });
  if (!ban || !ban.active) return null;
  if (!ban.permanent && ban.expiresAt && ban.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return ban;
}

/**
 * Log ONLY the security-relevant event: a blocked (banned) admin-login attempt.
 * The routine allowed case is not logged (it fired on every attempt and was pure
 * noise); every attempt is already persisted to AdminLoginAttempt for the audit
 * trail. The raw IP is not printed here — it lives in that DB record.
 */
export function logBanCheck(_ip: string, ban: BlockedIp | null): void {
  if (!ban) return;
  const expires = ban.permanent ? "permanent" : (ban.expiresAt?.toISOString() ?? "n/a");
  console.warn(`[admin-auth] blocked banned IP | reason=${ban.reason ?? "-"} | expires=${expires}`);
}
