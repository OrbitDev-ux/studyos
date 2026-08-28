import "server-only";
import { prisma } from "@/lib/prisma";
import { hashDeviceSecret, parseDeviceBearer } from "@/features/dev/agent-crypto";

/**
 * Verifies `Authorization: Bearer <deviceSecret>` on every agent → StudyOS
 * Web call (heartbeat, verify-session). This is the ONLY thing that proves
 * "the caller genuinely holds this device's long-lived credential" —
 * StudyOS never stores the raw secret, only its hash, looked up via a unique
 * index (same convention as PasswordResetToken.tokenHash): an attacker
 * without the exact secret cannot produce a matching hash to find any row.
 */
export async function requireDeviceAuth(authHeader: string | null) {
  const secret = parseDeviceBearer(authHeader);
  if (!secret) return null;

  const device = await prisma.devAgentDevice.findUnique({ where: { secretHash: hashDeviceSecret(secret) } });
  if (!device || device.revokedAt) return null;

  return device;
}
