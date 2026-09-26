#!/usr/bin/env node
/**
 * Production preflight — READ-ONLY environment validator.
 *
 * Checks that every variable the app + deploy actually reads is present, so a
 * migration/build/billing mutation never runs against a half-configured env.
 * It ONLY asserts existence; it never prints, exports, or "fixes" values, and
 * it never connects to any service (no DB, no API, no payments).
 *
 * USE (after exporting the target env, e.g. `--env-file=.env.production`):
 *   node --env-file=.env.production scripts/production-preflight.mjs
 *   npm run verify:production        # runs typecheck → lint → test → this → build
 *
 * EXIT CODES (intended for CI gating):
 *   0  ready — every CORE var present. Billing is inactive for new checkouts.
 *   1  CORE variables are missing — do NOT migrate/build/deploy.
 *   2  deprecated/abandoned Lemon Squeezy env variables remain configured.
 *
 * FLAGS:
 *   --require-billing   retained for compatibility; ignored in FREE_ONLY mode.
 */

// ─── What the app actually reads (src/lib/env-check.ts REQUIRED, plus the
// ─── billing env table in docs/BILLING_POLAR.md). Keep in lockstep. ─────────

const CORE = Object.freeze([
  { name: "DATABASE_URL", purpose: "Prisma runtime + app pooler connection" },
  { name: "DIRECT_URL", purpose: "prisma migrate/generate (unpooled connection)" },
  { name: "AUTH_SECRET", purpose: "session signing (NextAuth)" },
  { name: "AUTH_URL", purpose: "auth callback + SITE_URL/canonical origin" },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    purpose: "edge maintenance gate + storage (public, not secret)",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    purpose: "edge maintenance gate read (public anon key — secrets live server-side)",
  },
  { name: "SUPABASE_SERVICE_ROLE_KEY", purpose: "server-only Storage (admin.ts)" },
  { name: "ADMIN_SECRET", purpose: "admin bootstrap sign-in" },
  { name: "ADMIN_SESSION_SECRET", purpose: "admin session signing" },
]);

function aiProviderKey() {
  const provider = (process.env.AI_PROVIDER ?? "groq").trim().toLowerCase();
  return provider === "gemini"
    ? { name: "GEMINI_API_KEY", purpose: `AI features (AI_PROVIDER=${provider})` }
    : { name: "GROQ_API_KEY", purpose: "AI features (AI_PROVIDER=groq / default)" };
}

// Billing remains available only for historical records and webhook
// compatibility. It is not a release requirement in FREE_ONLY mode.
const BILLING_OPTIONAL = Object.freeze([
  { name: "POLAR_TOKEN", purpose: "inactive new-checkout runtime" },
  { name: "POLAR_WEBHOOK_SECRET", purpose: "legacy webhook compatibility" },
  { name: "POLAR_PRO_PRICE_ID", purpose: "historical catalog mapping" },
  { name: "POLAR_PRO_PRODUCT_ID", purpose: "historical catalog mapping" },
  {
    name: "POLAR_PREMIUM_PRICE_ID",
    purpose: "optional — PREMIUM not-for-sale at launch",
  },
  {
    name: "POLAR_PREMIUM_PRODUCT_ID",
    purpose: "optional — PREMIUM not-for-sale at launch",
  },
  { name: "TOSS_SECRET_KEY", purpose: "legacy billing-key subscriptions" },
  { name: "NEXT_PUBLIC_TOSS_CLIENT_KEY", purpose: "legacy billing UI (inactive)" },
]);

// ─── Report ─────────────────────────────────────────────────────────────────

function fmt(table) {
  const width = Math.max(...table.map(([name]) => name.length), 0);
  return table.map(([name, status]) => `  ${name.padEnd(width)} ${status}`).join("\n");
}

const report = [];
const collect = (name, present, group) =>
  report.push([`${name} [${group}]`, present ? "READY" : "MISSING", group, present]);

for (const item of CORE)
  collect(item.name, Boolean(process.env[item.name]?.trim()), "core");
collect(aiProviderKey().name, Boolean(process.env[aiProviderKey().name]?.trim()), "core");
for (const name of ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"]) {
  collect(name, Boolean(process.env[name]?.trim()), "optional-auth");
}

for (const item of BILLING_OPTIONAL) {
  const present = Boolean(process.env[item.name]?.trim());
  collect(item.name, present, "historical-billing");
}

const sandboxFlag = process.env.POLAR_SANDBOX;
const baseOverridden = Boolean(process.env.POLAR_API_URL?.trim());
if (sandboxFlag || baseOverridden) {
  collect(
    sandboxFlag === "1"
      ? "POLAR_SANDBOX (=1, sandbox mode)"
      : "POLAR_API_URL (base override)",
    true,
    "note",
  );
}

// NEXT_PUBLIC_POLAR_* would inline secrets into the client bundle — warn once.
if (process.env.NEXT_PUBLIC_POLAR_TOKEN) {
  report.push(["NEXT_PUBLIC_POLAR_TOKEN (FORBIDDEN)", "PRESENT", "warn", true]);
}
if (process.env.NEXT_PUBLIC_POLAR_WEBHOOK_SECRET) {
  report.push(["NEXT_PUBLIC_POLAR_WEBHOOK_SECRET (FORBIDDEN)", "PRESENT", "warn", true]);
}

if (process.env.POLAR_SANDBOX && process.env.POLAR_DEV_SINGLE_PLAN) {
  report.push([
    "POLAR_DEV_SINGLE_PLAN (dev-only flag — confirm target is SANDBOX, never prod)",
    "PRESENT",
    "warn",
    true,
  ]);
}

const coreMissing = report.some(([, s, g]) => s === "MISSING" && g === "core");
const abandonedProviderNames = Object.keys(process.env).filter(
  (name) => name.startsWith("LEMONSQUEEZY_") && process.env[name]?.trim(),
);
for (const name of abandonedProviderNames) {
  report.push([`${name} (REMOVE FROM ACTIVE ENV)`, "FAIL", "billing", false]);
}

// Partial PREMIUM configuration (exactly one of price/product set) is never a
// P0 for launch — but flag it so a half-made switch is caught before checkout.
const premiumPrice = Boolean(process.env.POLAR_PREMIUM_PRICE_ID?.trim());
const premiumProduct = Boolean(process.env.POLAR_PREMIUM_PRODUCT_ID?.trim());
if (premiumPrice !== premiumProduct) {
  report.push(["POLAR_PREMIUM_* (partial — one set, one missing)", "WARN", "warn", true]);
}

console.log("\nStudyOS production preflight\n");
console.log(fmt(report.map(([name, status]) => [name, status])));
console.log("");

if (coreMissing) {
  console.log("✗ BLOCKED: missing CORE variables — do NOT migrate/build/deploy yet.");
  process.exit(1);
}

if (abandonedProviderNames.length > 0) {
  console.log("✗ BLOCKED: Lemon Squeezy variables remain in the active environment.");
  process.exit(2);
}

console.log("✓ CORE environment ready.");
console.log("• New checkout disabled by FREE_ONLY policy; historical billing compatibility retained.");
process.exit(0);
