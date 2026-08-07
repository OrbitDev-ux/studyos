// Minimal signed-token admin session, built on the Web Crypto API instead of
// a JWT library — the claim shape is fixed and small, and Web Crypto's HMAC
// sign/verify gives us a constant-time signature check for free. Works
// unmodified on both the Edge runtime (middleware) and Node (Server Actions).
//
// The token now carries the admin's identity (id + role) so pages and actions
// can authorize by role without a second lookup on the hot path; anything that
// must reflect live state (isActive flips, role changes) re-reads AdminUser.
import type { AdminRole } from "@/generated/prisma/client";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

export type AdminSessionPayload = {
  sub: string; // AdminUser.id
  role: AdminRole;
  iat: number;
  exp: number;
};

function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createAdminSessionToken(identity: {
  sub: string;
  role: AdminRole;
}): Promise<string> {
  const key = await getSigningKey();
  const now = Date.now();
  const payload: AdminSessionPayload = {
    sub: identity.sub,
    role: identity.role,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signatureBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signatureBytes)}`;
}

/** Returns the decoded payload for a valid, unexpired token, or null. */
export async function verifyAdminSessionToken(
  token: string | undefined,
): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  try {
    const key = await getSigningKey();
    const payloadBytes = base64UrlDecode(payloadPart);
    const signatureBytes = base64UrlDecode(signaturePart);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer as ArrayBuffer,
      payloadBytes.buffer as ArrayBuffer,
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as AdminSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
