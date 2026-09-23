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
 *   0  ready — every CORE var present; every BILLING var present if
 *      --require-billing (or run under `npm run verify:production`).
 *   1  CORE variables are missing — do NOT migrate/build/deploy.
 *   2  CORE present but BILLING variables are missing while --require-billing.
 *
 * FLAGS:
 *   --require-billing   fail (exit 2) when Polar/Toss credentials are missing.
 */

const FLAGS = new Set(process.argv.slice(2));

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

// Billing block — validated as a unit so revenue can be "not configured" (a
// valid, fail-closed state) instead of half-configured (the dangerous one:
// POLAR_TOKEN set but no PRO price/product ids → 500s on live clicks).
//
// LAUNCH CONTRACT (since the $9.99 decision): the catalog sells ONLY PRO
// ($9.99 USD / month via Polar). Required = POLAR_TOKEN + POLAR_WEBHOOK_SECRET
// + POLAR_PRO_PRICE_ID + POLAR_PRO_PRODUCT_ID. PREMIUM ids are OPTIONAL
// (not-for-sale); a only-one-of-pair PREMIUM config is a WARNING, never a P0.
const BILLING_REQUIRED = Object.freeze([
  { name: "POLAR_TOKEN", purpose: "Polar REST access token (server-only)" },
  { name: "POLAR_WEBHOOK_SECRET", purpose: "HMAC secret for /api/webhooks/polar" },
  { name: "POLAR_PRO_PRICE_ID", purpose: "price id → StudyOS PRO ($9.99/month)" },
  {
    name: "POLAR_PRO_PRODUCT_ID",
    purpose: "product id → StudyOS PRO (checkout API selects by product)",
  },
]);

const BILLING_OPTIONAL = Object.freeze([
  {
    name: "POLAR_PREMIUM_PRICE_ID",
    purpose: "optional — PREMIUM not-for-sale at launch",
  },
  {
    name: "POLAR_PREMIUM_PRODUCT_ID",
    purpose: "optional — PREMIUM not-for-sale at launch",
  },
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

let billingPresentCount = 0;
const devSandbox =
  process.env.POLAR_SANDBOX === "1" &&
  ["pro", "premium"].includes(process.env.POLAR_DEV_SINGLE_PLAN ?? "");

// Dev-only single-plan sandbox substitution: in POLAR_SANDBOX=1 the PRO and/or
// PREMIUM price+product requirements are satisfied by ONE real sandbox
// product/price (POLAR_TEST_PRICE_ID / POLAR_TEST_PRODUCT_ID).
const devReplaces = (name) =>
  [
    "POLAR_PRO_PRICE_ID",
    "POLAR_PREMIUM_PRICE_ID",
    "POLAR_PRO_PRODUCT_ID",
    "POLAR_PREMIUM_PRODUCT_ID",
  ].includes(name);

for (const item of [...BILLING_REQUIRED, ...BILLING_OPTIONAL]) {
  if (devSandbox && devReplaces(item.name)) {
    const testEnv = item.name.endsWith("_PRODUCT_ID")
      ? "POLAR_TEST_PRODUCT_ID"
      : "POLAR_TEST_PRICE_ID";
    const satisfied = Boolean(process.env[testEnv]?.trim());
    const required = BILLING_REQUIRED.includes(item);
    collect(
      `${item.name} (dev single-plan ${process.env.POLAR_DEV_SINGLE_PLAN}: ${testEnv})`,
      satisfied,
      "note",
    );
    // Count only REQUIRED satisfied vars toward the billing gate; optional
    // dev substitutions still show up in the notes.
    if (satisfied && required) billingPresentCount += 1;
    continue;
  }
  const present = Boolean(process.env[item.name]?.trim());
  const required = BILLING_REQUIRED.includes(item);
  if (present && required) billingPresentCount += 1;
  collect(item.name, present, required ? "billing" : "billing-optional");
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
const requireBilling = FLAGS.has("--require-billing");
const billingMissing = billingPresentCount < BILLING_REQUIRED.length;

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

if (requireBilling && billingMissing) {
  console.log(
    "✗ BLOCKED(--require-billing): Polar launch billing is only partially configured.",
  );
  console.log(
    "  Required: POLAR_TOKEN + POLAR_WEBHOOK_SECRET + POLAR_PRO_PRICE_ID + POLAR_PRO_PRODUCT_ID.",
  );
  console.log(
    "  A full set keeps checkout fail-closed; a partial set 500s on live clicks.",
  );
  process.exit(2);
}

console.log("✓ CORE environment ready.");
if (billingPresentCount === BILLING_REQUIRED.length) {
  console.log(
    "✓ Polar launch billing configured (PRO only; PREMIUM optional/not-for-sale).",
  );
} else if (billingPresentCount === 0) {
  console.log("• Billing not configured — fail-closed (checkout disabled).");
} else {
  console.log(
    "• WARNING: billing is PARTIALLY configured; resolve before revenue go-live.",
  );
}
process.exit(0);
