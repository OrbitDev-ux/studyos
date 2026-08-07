// Client-IP resolution and normalization, shared by the ban check (at login)
// and the admin ban tools (when storing / displaying an IP). Both sides MUST
// normalize identically, otherwise a stored ban never matches the detected IP
// — the root cause of "IP bans don't work".

/**
 * Canonicalize an IP string so the same address always compares equal:
 * - unwrap bracketed IPv6  "[::1]" → "::1"
 * - strip an IPv4 port      "1.2.3.4:5678" → "1.2.3.4"
 * - unwrap IPv4-mapped IPv6 "::ffff:1.2.3.4" → "1.2.3.4"
 * - collapse loopback       "::1" → "127.0.0.1"
 * - lowercase (IPv6 hex is case-insensitive)
 */
export function normalizeIp(raw: string): string {
  let ip = raw.trim();
  if (!ip) return "unknown";

  ip = ip.replace(/^\[/, "").replace(/\]$/, "");

  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];

  const v4WithPort = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/.exec(ip);
  if (v4WithPort?.[1]) return v4WithPort[1];

  if (ip === "::1") return "127.0.0.1";

  return ip.toLowerCase();
}

function firstForwarded(value: string | null): string | null {
  if (!value) return null;
  // "client, proxy1, proxy2" — the left-most is the original client.
  const first = value.split(",")[0]?.trim();
  return first || null;
}

/**
 * Resolve the real client IP from proxy headers, in priority order:
 *   1. cf-connecting-ip     (Cloudflare)
 *   2. true-client-ip       (Cloudflare Enterprise / Akamai)
 *   3. x-vercel-forwarded-for (Vercel edge)
 *   4. x-forwarded-for      (standard reverse proxies; left-most entry)
 *   5. x-real-ip            (nginx and friends)
 * Returns "unknown" when nothing usable is present (e.g. some local setups).
 */
export function getClientIp(headers: Headers): string {
  const candidate =
    headers.get("cf-connecting-ip") ??
    headers.get("true-client-ip") ??
    headers.get("x-vercel-forwarded-for") ??
    firstForwarded(headers.get("x-forwarded-for")) ??
    headers.get("x-real-ip");

  return candidate ? normalizeIp(candidate) : "unknown";
}
