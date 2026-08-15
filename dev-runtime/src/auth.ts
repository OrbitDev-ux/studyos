import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Two independent auth mechanisms (§4, §17):
 *
 * 1. Service token — a static shared secret StudyOS Web sends on every
 *    server-to-server call (container lifecycle, filesystem, run, git,
 *    metrics). Web has ALREADY verified `requireCurrentUser()` + workspace
 *    ownership (DB WHERE clause) before ever calling here; this only proves
 *    "the caller is StudyOS Web", not who the end user is. Compared in
 *    constant time to avoid a timing side-channel.
 *
 * 2. Capability token — a short-lived HMAC-signed token StudyOS Web mints
 *    (via a server action, after the same ownership check) for the TWO
 *    endpoints the BROWSER hits directly, bypassing Web: the terminal
 *    WebSocket and the preview proxy. Self-verifying (no DB call needed
 *    here) — the runtime never re-implements StudyOS's user auth (§4); it
 *    only checks "did Web vouch for this workspace, recently, for this
 *    scope". Payload/signature layout is intentionally kept in sync with
 *    `src/features/dev/runtime-token.ts` on the Web side — duplicated
 *    (not a shared package) because these are separately deployed services.
 */

export function verifyServiceToken(authorizationHeader: string | undefined, secret: string): boolean {
  if (!authorizationHeader?.startsWith("Bearer ") || !secret) return false;
  const provided = Buffer.from(authorizationHeader.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export type CapabilityScope = "terminal" | "preview";

export type CapabilityPayload = {
  sub: string; // userId
  wsid: string; // workspaceId
  scope: CapabilityScope;
  exp: number; // unix seconds
};

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(payloadB64).digest());
}

/** Not used by the runtime itself (only StudyOS Web mints tokens) — exported
 * for the runtime's own tests and as the reference implementation the Web
 * side's `runtime-token.ts` is kept in sync with. */
export function signCapabilityToken(
  payload: Omit<CapabilityPayload, "exp"> & { ttlSeconds: number },
  secret: string,
): string {
  const full: CapabilityPayload = {
    sub: payload.sub,
    wsid: payload.wsid,
    scope: payload.scope,
    exp: Math.floor(Date.now() / 1000) + payload.ttlSeconds,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function verifyCapabilityToken(
  token: string,
  secret: string,
  scope: CapabilityScope,
): CapabilityPayload | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = sign(payloadB64, secret);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload: CapabilityPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof payload.sub !== "string" ||
    typeof payload.wsid !== "string" ||
    typeof payload.exp !== "number" ||
    payload.scope !== scope
  ) {
    return null;
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expired

  return payload;
}
