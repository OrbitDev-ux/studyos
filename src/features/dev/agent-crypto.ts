// Pure crypto helpers for StudyOS Dev's Local Agent pairing/session system.
// Kept import-free of "server-only" so this is unit-testable in the node test
// environment, mirroring features/auth/reset-token.ts's exact pattern: every
// random secret here is high-entropy (never a low-entropy user-chosen value),
// so a SHA-256 hash (not bcrypt) plus a constant-time compare is the right,
// established convention for this codebase.
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Unambiguous charset (no 0/O/1/I/L) for a code a human reads off a terminal
 * and may need to type into a browser. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** e.g. "WXPK-7RTN" — short enough to type, long enough (32^8 ≈ 2^40) that
 * combined with a short TTL + attempt cap, guessing it is infeasible. */
export function generatePairingCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    if (i === 3) out += "-";
  }
  return out;
}

/** Normalizes user-typed input the same way on every path (case, dashes,
 * whitespace) so a pasted or manually-typed code always hashes identically. */
export function normalizePairingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashPairingCode(code: string): string {
  return createHash("sha256").update(normalizePairingCode(code)).digest("hex");
}

/** The device's long-lived credential (§6) — 256 bits, URL-safe. Generated
 * once at pairing approval; StudyOS stores only its hash from that moment on. */
export function generateDeviceSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** The one-time browser→agent connect token (§17-equivalent capability). */
export function generateSessionToken(): string {
  return randomBytes(24).toString("base64url");
}

export function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Parses `Authorization: Bearer <deviceSecret>` — the format the agent
 * authenticates its own (agent → StudyOS Web) calls with. The secret alone is
 * enough to identify the device: agent-server-auth.ts looks it up by the hash
 * (a unique index), the same pattern PasswordResetToken.tokenHash uses, so
 * there's no separate deviceId to keep in sync client-side and no manual
 * string comparison (DB unique-index lookup is not a timing side-channel the
 * way `hashA === hashB` can theoretically be). */
export function parseDeviceBearer(authHeader: string | null | undefined): string | null {
  const value = authHeader ?? "";
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}
