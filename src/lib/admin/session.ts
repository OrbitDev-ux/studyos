// Minimal signed-token admin session, built on the Web Crypto API instead of
// a JWT library — it's a single fixed claim shape (issued/expiry only, no
// user identity), and Web Crypto's HMAC sign/verify already gives us a
// constant-time signature check for free. Works unmodified on both the Edge
// runtime (middleware) and Node (Server Actions).
export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

type AdminSessionPayload = {
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

export async function createAdminSessionToken(): Promise<string> {
  const key = await getSigningKey();
  const now = Date.now();
  const payload: AdminSessionPayload = {
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const signatureBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${base64UrlEncode(payloadBytes)}.${base64UrlEncode(signatureBytes)}`;
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return false;

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
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as AdminSessionPayload;
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
