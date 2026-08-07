// Dependency-free verification of the IP-ban core logic. Run with:
//   node scripts/verify-ban.mjs
// It mirrors src/lib/ip.ts (normalizeIp) and src/features/admin/ip-ban.ts
// (findActiveBan's effect rule) and asserts the scenarios the spec calls for:
// IPv4/IPv6/proxy normalization, and permanent / timed / expired / released bans.

// ── mirror of normalizeIp (keep in sync with src/lib/ip.ts) ──────────────────
function normalizeIp(raw) {
  let ip = String(raw).trim();
  if (!ip) return "unknown";
  ip = ip.replace(/^\[/, "").replace(/\]$/, "");
  const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(ip);
  if (mapped) return mapped[1];
  const v4WithPort = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d+$/.exec(ip);
  if (v4WithPort) return v4WithPort[1];
  if (ip === "::1") return "127.0.0.1";
  return ip.toLowerCase();
}

// ── mirror of findActiveBan's effect rule (keep in sync with ip-ban.ts) ──────
function isEffective(ban, now = Date.now()) {
  if (!ban || !ban.active) return false;
  if (!ban.permanent && ban.expiresAt && new Date(ban.expiresAt).getTime() <= now) return false;
  return true;
}

let passed = 0;
let failed = 0;
function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${ok ? "" : ` — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  ok ? passed++ : failed++;
}

console.log("[normalizeIp]");
assert("IPv4", normalizeIp("203.0.113.4"), "203.0.113.4");
assert("IPv4 + port", normalizeIp("203.0.113.4:54321"), "203.0.113.4");
assert("IPv6", normalizeIp("2001:DB8::1"), "2001:db8::1");
assert("IPv6 bracketed", normalizeIp("[2001:db8::1]"), "2001:db8::1");
assert("IPv4-mapped IPv6", normalizeIp("::ffff:203.0.113.4"), "203.0.113.4");
assert("loopback IPv6 → IPv4", normalizeIp("::1"), "127.0.0.1");
assert("empty → unknown", normalizeIp("  "), "unknown");

console.log("[ban effect]");
const now = Date.now();
const hour = 3600 * 1000;
assert("permanent active → blocked", isEffective({ active: true, permanent: true, expiresAt: null }, now), true);
assert("timed, future → blocked", isEffective({ active: true, permanent: false, expiresAt: new Date(now + hour) }, now), true);
assert("timed, past → not blocked", isEffective({ active: true, permanent: false, expiresAt: new Date(now - hour) }, now), false);
assert("released (inactive) → not blocked", isEffective({ active: false, permanent: true, expiresAt: null }, now), false);
assert("no ban → not blocked", isEffective(null, now), false);

console.log("[login flow — normalize then match]");
// A proxy sends the client as an IPv4-mapped IPv6; the ban stored the plain IPv4.
const detected = normalizeIp("::ffff:198.51.100.7");
const stored = normalizeIp("198.51.100.7");
assert("proxy-detected matches stored ban", detected === stored, true);

console.log(`\n${failed === 0 ? "ALL PASS" : "FAILURES"}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
