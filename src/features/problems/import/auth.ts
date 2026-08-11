import { timingSafeEqual } from "node:crypto";

/**
 * Pure authorization for POST /api/problems/import — extracted from the route so
 * it is unit-testable and the trimming rule is verifiable.
 *
 * Both sides of the comparison are TRIMMED: the caller (the MCP client) trims the
 * token it sends, and secrets pasted into a Vercel env var very often pick up a
 * trailing newline/space. If only one side trims, the constant-time compare sees
 * different lengths and rejects a token that is otherwise identical → a confusing
 * 401. Trimming `expected` here removes that whole class of failure.
 *
 * Diagnostics expose LENGTHS ONLY (never the token) so an operator can tell a
 * value mismatch (equal lengths) from a whitespace/config mismatch.
 */

export type ImportAuthResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "unauthorized";
      expectedLength: number;
      providedLength: number;
    };

/**
 * Normalize a token the SAME way the MCP client does before sending, so both
 * sides agree: trim surrounding whitespace/newlines and strip a single pair of
 * accidental surrounding quotes (a common Vercel/CI copy-paste artifact like
 * `"abc"` / `'abc'`). Keeping this identical on both ends is what prevents a
 * spurious 401 for an otherwise-matching secret.
 */
export function sanitizeToken(raw: string | null | undefined): string {
  let t = (raw ?? "").trim();
  if (
    t.length >= 2 &&
    ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Extract + sanitize the token from an `Authorization: Bearer <token>` header. */
export function parseBearerToken(authHeader: string | null | undefined): string {
  const value = authHeader ?? "";
  return value.startsWith("Bearer ") ? sanitizeToken(value.slice(7)) : "";
}

/** Constant-time equality that is length-safe (no throw on length mismatch). */
export function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Authorize an import request. `rawExpected` is the raw env value
 * (PROBLEM_IMPORT_TOKEN) — trimmed here so env whitespace never causes a 401.
 */
export function authorizeImport(
  authHeader: string | null | undefined,
  rawExpected: string | undefined | null,
): ImportAuthResult {
  const expected = sanitizeToken(rawExpected);
  const provided = parseBearerToken(authHeader);

  if (!expected) {
    return { ok: false, reason: "not_configured", expectedLength: 0, providedLength: provided.length };
  }
  if (!provided || !tokensMatch(provided, expected)) {
    return {
      ok: false,
      reason: "unauthorized",
      expectedLength: expected.length,
      providedLength: provided.length,
    };
  }
  return { ok: true };
}
