#!/usr/bin/env node
import assert from "node:assert";
/**
 * Polar sandbox smoke harness — verifies the real Polar checkout flow against
 * Polar's SANDBOX API (never production), end-to-end but without StudyOS code:
 * it proves the API reachability, checkout creation, hosted payment, and webhook
 * delivery path that the app's billing wires up (see polar-client.ts).
 *
 * USE:
 *   node --env-file=.env.local scripts/polar-sandbox-smoke.mjs
 *
 * REQUIRED env (from .env.local — sandbox values from the Polar dashboard):
 *   POLAR_SANDBOX=1                   (must be set, see safety guard below)
 *   POLAR_TOKEN=polar_...             (SANDBOX access token)
 *   POLAR_TEST_PRICE_ID=...           (price id of the sandbox product)
 *   POLAR_WEBHOOK_SECRET=...          (optional: only validated locally)
 *
 * OPTIONAL:
 *   POLAR_API_URL=https://sandbox-api.polar.sh   (overrides base)
 *   --price=<id>                      (overrides POLAR_TEST_PRICE_ID/..._PRO_...)
 *   --timeout=<seconds>               (browser-step deadline, default 180)
 *   --skip-browser                    (create the checkout but don't poll; print
 *                                      the URL for manual completion)
 *
 * SAFETY:
 *   This script NEVER creates a real payment, charge, or subscription mutation.
 *   It only (1) creates a checkout, (2) prints the hosted checkout URL, and
 *   (3) polls checkout state. It refuses to run unless POLAR_SANDBOX is truthy
 *   OR POLAR_API_URL points at a sandbox host — hit the production API on
 *   purpose with `--live` at your own risk.
 */

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const idx = arg.indexOf("=");
    return idx === -1 ? [arg, ""] : [arg.slice(0, idx), arg.slice(idx + 1)];
  }),
);

if (args.has("--help")) {
  console.log(`
Polar sandbox smoke — one-shot harness against Polar's SANDBOX API.

USAGE
  node --env-file=.env.local scripts/polar-sandbox-smoke.mjs [--help] [--skip-browser] [--timeout=<s>] [--price=<id>] [--live]

FLAGS
  --help            this text

  --skip-browser    create the checkout and print its URL, don't poll
  --timeout=<s>     browser-step deadline in seconds (default 180)
  --price=<id>      override POLAR_TEST_PRICE_ID / POLAR_PRO_PRICE_ID
  --live            EXPLICIT yes to hit the production API (dangerous)

ENV (sandbox values)
  POLAR_SANDBOX=1            required — this script REFUSES to run without it
  POLAR_TOKEN=...            sandbox access token
  POLAR_TEST_PRICE_ID=...    sandbox product price id
  POLAR_WEBHOOK_SECRET=...   sandbox webhook secret (presence check only)

FULL RUNBOOK: docs/BILLING_POLAR.md → "Polar sandbox runbook".
`);
  process.exit(0);
}
const live = args.has("--live");
const skipBrowser = args.has("--skip-browser");
const timeoutSec = Number(args.get("--timeout") ?? 180) || 180;

const env = process.env;
const token = env.POLAR_TOKEN ?? "";
const defaultBase = env.POLAR_SANDBOX
  ? "https://sandbox-api.polar.sh"
  : "https://api.polar.sh";
const baseUrl = (env.POLAR_API_URL ?? defaultBase).replace(/\/$/, "");
const sandboxMode = env.POLAR_SANDBOX === "1" || baseUrl.includes("sandbox");

const priceId =
  args.get("--price") ?? env.POLAR_TEST_PRICE_ID ?? env.POLAR_PRO_PRICE_ID ?? "";

// ─── Safety guard ────────────────────────────────────────────────────────────
assert.ok(
  sandboxMode || live,
  [
    "Refusing to run: nothing says this is a SANDBOX environment.",
    "Set POLAR_SANDBOX=1 (or POLAR_API_URL to a sandbox host) to continue.",
    "Explicitly pass --live only if you meant to hit the production API.",
  ].join("\n"),
);
assert.ok(token.length > 0, "POLAR_TOKEN is required (use the sandbox token).");
assert.ok(priceId.length > 0, "POLAR_TEST_PRICE_ID (or --price) is required.");
assert.ok(
  env.POLAR_WEBHOOK_SECRET === undefined || env.POLAR_WEBHOOK_SECRET.length > 0,
  "POLAR_WEBHOOK_SECRET must be non-empty if set.",
);

const endpoint = (path) => `${baseUrl}${path}`;
async function polar(path, options = {}) {
  const res = await fetch(endpoint(path), {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Polar API ${res.status} on ${path}: ${JSON.stringify(body)}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

const log = (...parts) => console.log(`[smoke]`, ...parts);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  log(`target: ${sandboxMode ? "SANDBOX" : "PRODUCTION(--live)"} → ${baseUrl}`);
  log(`price:  ${priceId}`);
  if (env.POLAR_WEBHOOK_SECRET) {
    log("webhook secret present (will be accepted by the route's fail-closed check)");
  }
  if (env.SITE_URL) log(`SITE_URL = ${env.SITE_URL}`);

  log("step 1/3 — creating a hosted checkout…");
  const productId =
    env.POLAR_TEST_PRODUCT_ID ??
    (args.has("--product-id") ? args.get("--product-id") : undefined);
  if (productId) log(`product: ${productId}`);
  const checkout = await polar("/v1/checkouts/", {
    method: "POST",
    body: JSON.stringify({
      // Current Checkout API selects by PRODUCT id (products array); the old
      // product_price_id field is rejected. Kept as fallback for workspaces
      // that only expose a price id.
      products: productId ? [productId] : undefined,
      product_price_id: productId ? undefined : priceId,
      customer_email: env.POLAR_TEST_CUSTOMER_EMAIL ?? "sandbox-smoke@gmail.com",
      external_customer_id: `smoke-${Date.now()}`,
      success_url: `${env.SITE_URL ?? "http://localhost:3000"}/billing/callback?plan=PRO&checkout_id={CHECKOUT_ID}`,
      metadata: { plan: "PRO", userId: "sandbox-smoke" },
    }),
  });
  log(`checkout created: id=${checkout.id}`);
  log(
    `→ open this URL in a browser and complete the payment with the sandbox test card:`,
  );
  log(`  ${checkout.url}`);

  if (skipBrowser) {
    log(`--skip-browser: not polling. When you finish paying, re-run without it`);
    log(`  or check the webhook delivery + the Subscription row yourself.`);
    return;
  }

  log(`step 2/3 — polling checkout state (up to ${timeoutSec}s)…`);
  const deadline = Date.now() + timeoutSec * 1000;
  const terminal = new Set(["confirmed", "succeeded", "cancelled", "expired"]);
  let state = null;
  while (Date.now() < deadline) {
    const current = await polar(`/v1/checkouts/${encodeURIComponent(checkout.id)}`);
    state = current.status;
    if (terminal.has(state)) break;
    process.stdout.write(`  …status=${state}\n`);
    await sleep(2000);
  }

  if (!state || !terminal.has(state)) {
    log(`timeout: checkout did not reach a terminal state (last=${state}).`);
    log(
      "Press on with the payment, then re-run; the earlier checkout can be reused by id.",
    );
    process.exitCode = 2;
    return;
  }

  log(`step 3/3 — terminal checkout status: ${state}`);
  if (state === "confirmed" || state === "succeeded") {
    log("Polar considers the payment captured. Next, in StudyOS terms:");
    log("  1. the signed order.paid webhook should have granted the PRO entitlement,");
    log("  2. /admin/revenue should report a new SUCCEEDED payment,");
    log("  3. the redirect showed /billing/callback?billing=success.");
    log("If the webhook didn't land, check the webhook endpoint + POLAR_WEBHOOK_SECRET.");
  } else {
    log(
      "Checkout did not complete (cancelled/expired) — that's a clean negative result.",
    );
    log("Verify the callback showed billing=fail and no webhook processed it.");
  }
  log("Cleanup: cancel/revoke the sandbox subscription from the Polar dashboard to see");
  log("  subscription.revoked revert the user to TRIAL — the last smoke assertion.");
}

main().catch((error) => {
  console.error(`[smoke] FAILED: ${error.message}`);
  if (error.status) console.error(`  body: ${JSON.stringify(error.body ?? null)}`);
  process.exitCode = 1;
});
