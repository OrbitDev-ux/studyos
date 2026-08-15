import { createHmac } from "node:crypto";

/**
 * Mints short-lived, workspace-scoped capability tokens for the two things
 * the BROWSER talks to the Dev Runtime Backend directly, bypassing this app:
 * the terminal WebSocket and the preview proxy (§13/§25). Only ever called
 * from a server action, AFTER `requireCurrentUser()` + a DB ownership check
 * — this file has no idea what a "workspace" is beyond an opaque id string
 * the caller already verified.
 *
 * Payload/signing layout is intentionally kept in sync (duplicated, not
 * shared — separately deployed services) with `dev-runtime/src/auth.ts`'s
 * `signCapabilityToken`/`verifyCapabilityToken`. If you change one, change
 * both, or every browser-facing connection breaks. Pure (no Next.js
 * "server-only" APIs) so it's directly unit-testable; `runtime-token.ts`
 * re-exports this under the "server-only" guard actions actually import.
 */
export type CapabilityScope = "terminal" | "preview";

const DEFAULT_TTL_SECONDS = 60;

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export function signCapabilityToken(
  userId: string,
  workspaceId: string,
  scope: CapabilityScope,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  secretOverride?: string,
): string | null {
  const secret = secretOverride ?? process.env.DEV_RUNTIME_CAPABILITY_SECRET;
  if (!secret) return null;

  const payload = {
    sub: userId,
    wsid: workspaceId,
    scope,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = base64url(createHmac("sha256", secret).update(payloadB64).digest());
  return `${payloadB64}.${sig}`;
}
