// Pure crypto helpers (node `crypto` — effectively server-only since it can't be
// bundled for the client). Kept import-free of "server-only" so the token
// hashing logic is unit-testable in the node test environment.
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Reset tokens expire quickly to limit the window of a leaked link. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Generate a URL-safe, high-entropy one-time token (the RAW value emailed to
 * the user — never stored). 32 random bytes = 256 bits. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of a token. Only this hash is stored, so a DB leak can't be used
 * to reset accounts. (SHA-256 is appropriate here — the token is already
 * high-entropy random, unlike a low-entropy user password.) */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare of two token hashes (defense-in-depth; lookups are by
 * unique hash, but avoid any timing signal on the compare). */
export function resetTokenHashEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
