# Implementation Tracker — StudyOS

Status of the phased rebuild. Each phase is "done" only when
typecheck + lint + the full test suite are green (see `docs/HANDOFF.md`).

| Phase                                             | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Status                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A                                                 | RLS + session hardening: battle, ranking, social (row-level security, `requireCurrentUser`, party-scoped access)                                                                                                                                                                                                                                                                                                                                           | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| B                                                 | Supabase REST → Prisma for **problems** module; missing-method gap fix; `getProblemsFromIds` missing-priority; admin overrides bypass; `adminViewProblem` rework                                                                                                                                                                                                                                                                                           | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| C1                                                | `@/lib/supabase/server` → `getCurrentUser` on pages/actions/routes; `@/lib/supabase/middleware` → config-based `auth.config.ts`; `middleware.ts` trimmed; NAVIGATION `(app)` 401-vs-403 regression guards                                                                                                                                                                                                                                                  | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| C2                                                | Close the anon-REST trust boundary: migrate remaining 12 REST call sites to Prisma (problems/battle/ranking/social), revoke all anon/authenticated grants, enable RLS on 12 user-data tables, `Maintenance` singleton carve-out, delete `lib/supabase/server                                                                                                                                                                                               | client                                                                                                                                                                                                                                                                                                                                                                                                                               | middleware.ts` | ✅ done |
| D                                                 | Billing provider abstraction: `providers.ts` (`activeBillingProvider`, `isBillingConfigured`, `isCheckoutUsable`), Polar client + webhook route + `polar-events.ts`, Toss kept as legacy                                                                                                                                                                                                                                                                   | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| E                                                 | Provider-aware checkout: `startCheckout`, cancel/resume for Polar, callback Polar branch, renewal + stale-key cleanup filtered to Toss, pricing gate, `.env.example`, tests, `docs/BILLING_POLAR.md`                                                                                                                                                                                                                                                       | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| F                                                 | Growth/SEO: landing/funnel copy, PLG surface (referral / waitlist / welcome email), SEO metadata hardening, analytics event SLA                                                                                                                                                                                                                                                                                                                            | 🟡 in progress (SEO metadata + `docs/MARKETING.md` done; PLG referral/waitlist/welcome email pending decision)                                                                                                                                                                                                                                                                                                                       |
| G                                                 | Analytics: product event tracking (`src/features/analytics`, typed event SLA, server + Vercel-beacon sinks, events wired, `docs/ANALYTICS.md`)                                                                                                                                                                                                                                                                                                             | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H                                                 | Project docs: `BILLING_POLAR.md`, `MARKETING.md`, `ANALYTICS.md`, `HANDOFF.md`, this tracker                                                                                                                                                                                                                                                                                                                                                               | ✅ done (remainder of H = `NEXT_AGENT_UPGRADE.md`)                                                                                                                                                                                                                                                                                                                                                                                   |
| I — Revenue Readiness Phase 2                     | Billing hardening: partial refunds never fully revoke (`revokeEntitlement: false`), `subscription.revoked` falls back to our own row when `metadata.userId` is missing — with tests                                                                                                                                                                                                                                                                        | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phase 7                     | Funnel measurement: `checkout_started` (only after a checkout session actually exists) + `pricing_viewed` (client), catalog/docs updated                                                                                                                                                                                                                                                                                                                   | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phase 10                    | Revenue foundation: `features/billing/metrics.ts` (read-only, DB-derived) + `/admin/revenue` (SUPER_ADMIN) + nav entry                                                                                                                                                                                                                                                                                                                                     | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phase 12                    | Security tests: callback ownership mismatch, unauthenticated `startCheckout`, partial-refund / revoked-fallback coverage                                                                                                                                                                                                                                                                                                                                   | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phase 4                     | `scripts/polar-sandbox-smoke.mjs` — sandbox checkout smoke harness (execution blocked on sandbox credentials)                                                                                                                                                                                                                                                                                                                                              | 🟡 blocked (code done, run needs creds)                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phases 1/3/13/14            | Migration preflight + env contract table (`BILLING_POLAR.md`) + `docs/PRODUCTION_CHECKLIST.md` + doc updates (HANDOFF/TRACKER/NEXT_AGENT)                                                                                                                                                                                                                                                                                                                  | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I — Revenue Readiness Phase 11                    | Full verification + attempted production build                                                                                                                                                                                                                                                                                                                                                                                                             | 🟡 code verified; build blocked (no env)                                                                                                                                                                                                                                                                                                                                                                                             |
| J — Final Pre-Deployment Gate                     | Regression audit (Toss PARTIAL_CANCELED parity fix + test), metrics semantics documented (+net label), preflight `scripts/production-preflight.mjs`, `npm run verify:production`, DB deploy-safety checklist, Polar sandbox runbook, failure/rollback runbook, P0/P1/P2 classification                                                                                                                                                                     | ✅ done (runtime creds still blocked)                                                                                                                                                                                                                                                                                                                                                                                                |
| K — Study-session reward eligibility (anti-cheat) | `StudySession.rewardEligibleDurationSec` + `lastVerifiedAt` (migration + backfill), `eligibility.ts` policy + checkpoint stamped from existing `touchPresence` heartbeat, `stopStudySession` rewards only verified time, competitive surfaces (streak/ranking/battle study_time/friend feed) read the verified field, tests                                                                                                                                | ✅ done                                                                                                                                                                                                                                                                                                                                                                                                                              |
| PRE-LAUNCH P0 CLOSURE (this session)              | Checklist consistency (§1/§10.1/§10.7/§11), migration static audit (3 pending), Phase K security review (multi-tab double-credit race fixed), USD/KRW revenue isolation fix, final regression (880 tests green), `docs/P0_CLOSURE.md` gate report; **production closure audit**: prod Polar org = 1× "$9.99 USD/month" product (no KRW/PREMIUM) → **price consistency FAIL**, preflight exit 1 (CORE MISSING), prod webhook unregistered, tree uncommitted | ✅ code/dry-run closed; **live sandbox workflow closed**: real USD payment → `order.paid`/`subscription.created` → Payment/Subscription/entitlement grant, idempotent redelivery, full-refund revert (gates 8–11,13); **BLOCKED**: prod creds (gates 1/16/17-canonical/19) + Polar price decision + prod webhook delivery of cancel/partial-refund/`subscription.revoked` (gates 12,14,15 — unit-tested, live delivery NOT observed) |

## Deploy-gated items

- [ ] `prisma migrate deploy` for `20260921000000_close_anon_rest_trust_boundary`,
      `20260922000000_refund_external_refund_id_unique`, and
      `20260923000000_study_session_reward_eligibility` (needs live DB creds;
      execution dry-run + post-state validation + §10.7 probe on a scratch
      Postgres 16 already PASS — see `docs/P0_CLOSURE.md`).
- [ ] Prisma migrations (47/47) apply-clean + 3 canonical pending verified on a scratch
      Postgres 16 (`prisma migrate status` → up to date; RLS/grants/columns/index/probe PASS
      — see `docs/P0_CLOSURE.md`); **live production** apply still needs DB creds
      (`DATABASE_URL`/`DIRECT_URL` MISSING in `.env.production`).
- [x] **Production Polar pricing RESOLVED ($9.99 launch decision, this session)**:
      the production product "StudyOS PRO" @ **$9.99 USD/month** IS the canonical
      catalog price. Code aligned (`PLAN_META` PRO = 999 USD/월, PREMIUM
      `notForSale`, isPolarConfigured = PRO-only, revenue per-currency).
      Action: set `POLAR_PRO_PRICE_ID`+`POLAR_PRO_PRODUCT_ID` in the prod env
      (PREMIUM pair optional) and run the §4/§19 id-consistency probe.
- [ ] Polar sandbox lifecycle — **payment→webhook→entitlement now verified live**
      (real USD order → `order.paid` grant, idempotent redelivery, full-refund revert).
      Remaining: cancel-at-period-end, partial refund (no-revoke), `subscription.revoked`
      (unit-tested only — the `polar listen` tunnel relays only `checkout.*`, so those
      events were never observed live; deliver them via a registered production webhook).
- [ ] Production webhook registration + real delivery at
      `https://<prod-domain>/api/webhooks/polar` (production domain/env unset).
- [ ] Commit the phase A–K tree (everything since `ca84aae` is uncommitted, incl. the 3
      canonical migrations); then canonical build/deploy/CI + post-deploy smoke.
- [ ] Full gate report: `docs/P0_CLOSURE.md` (status `BLOCKED`).

## Local sandbox E2E phase (current)

Reality check (code-verified, no creds): auth = NextAuth v5 JWT with
Credentials (email/password, bcryptjs) + optional Google; `requireCurrentUser`
/`getCurrentUserOrNull` resolve session → Prisma User row. DB = Prisma +
`@prisma/adapter-pg` using `DATABASE_URL` at runtime; migrations via
`prisma.config.ts` (`DIRECT_URL ?? DATABASE_URL`). Supabase is edge-maintenance

- Storage only (not needed for the billing E2E). Pricing → PRO uses
  `startCheckout()` via `UpgradeCheckoutButton`.

Env contract (code-derived): REQUIRED_LOCAL for this E2E =
`DATABASE_URL`, `DIRECT_URL` (or single direct connection), `AUTH_SECRET`,
`AUTH_URL` (+ POLAR block already present). `AUTH_GOOGLE_*`, `SUPABASE_*`,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_*`, AI keys, `NEXT_PUBLIC_TOSS_*` are
OPTIONAL/LEGACY for this phase. STATUS (this session): `.env.local` holds the
DB/Auth/Polar sandbox values (core set READY per preflight), so the four-value
gate above is closed — what remains is recreating the local `:5433` cluster
(data dir gone), running `polar listen`, and the interactive test-card payment.

## Witnessed (2026 sandbox E2E progress)

- DB recovered WITHOUT Docker/Supabase: a pre-existing Homebrew Postgres
  cluster (unknown owner, possibly real data) was left untouched; a fresh,
  isolated cluster was initdb'd at `127.0.0.1:5433` (`studyos`, trust auth) with
  the Supabase-style roles `anon`/`authenticated` plus a minimal `storage.buckets`
  table so the exact Prisma migration SQL replays. Docker/colima were not usable
  on this 8GB Mac (VZ/QEMU VMs OOM; Docker Desktop absent).
  `prisma migrate status` → up to date; `prisma migrate deploy` applied all 50
  migrations (local dev DB only). `DATABASE_URL`/`DIRECT_URL` =
  `postgresql://studyos@127.0.0.1:5433/studyos`; `AUTH_SECRET` generated,
  `AUTH_URL=http://localhost:4000`.
- Real-UI auth E2E (Playwright/Chromium): email/password signup →
  `/dashboard?welcome=1` with a working NextAuth session cookie.
- Checkout E2E: `/pricing` → "PRO(으)로 업그레이드" → real `startCheckout` →
  Polar **sandbox** hosted checkout created
  (`https://sandbox.polar.sh/checkout/...`; verified $9.99 USD / product
  269766f0-… / price 17764c17-… / status open).
- **Integration bug fixed (sandbox-verified)**: the current Polar Checkout API
  rejects the old `product_price_id` body (422) and wants
  `products: [productId]`. `createPolarCheckoutSession` now sends product ids;
  a per-plan `polarProductIdForPlan` + `POLAR_*_PRODUCT_ID` /
  `POLAR_TEST_PRODUCT_ID` config was added (fail-closed producer path, unit
  tested). 865/865 tests; tsc PASS; lint 0 errors/2 pre-existing warnings;
  preflight billing rows verified in dev-sandbox + production-sim modes.
- Remaining: **recreate** the local `:5433` DB (its data dir no longer exists —
  `pg_ctl initdb` + roles `anon`/`authenticated` + `storage.buckets` shim +
  `prisma migrate deploy`, see P0_CLOSURE scratch recipe), start the dev server,
  then `polar listen http://localhost:4000/api/webhooks/polar`
  (its session secret replaces the stored `POLAR_WEBHOOK_SECRET`), user completes
  the sandbox test payment in the checkout page, then verify Payment/
  Subscription/entitlement + cancel/refund/revoke + idempotency. Currency note:
  this sandbox payment is USD ($9.99) — never sum into KRW metrics.
- **Fresh evidence (this session)**: `polar` CLI installed + logged in (sandbox
  token present in `~/.polar/tokens.json`); live sandbox **checkout creation
  PASS** via `node --env-file=.env.local scripts/polar-sandbox-smoke.mjs
--skip-browser` (current sandbox token still valid; checkout `9053576d-…`
  created, `products:[productId]` payload); webhook 401 fail-closed path intact.
- **Live sandbox payment closed (this session)**: user completed a real sandbox
  checkout payment → Polar recorded `customer.created`,
  `subscription.created`, `order.paid` events (04:30Z, order
  `b8f4dcc7-a03b-4e48-8740-526ca661cdcf`, $9.99 USD, metadata `{plan:PRO,
userId:cmud9qrd60000nqwh06szxect}`). `checkout.created` was relayed live by
  `polar listen` → 200 OK; but the CLI tunnel does NOT relay `order.*`/
  `subscription.*` events (only `checkout.*`), so those events were delivered
  into `/api/webhooks/polar` via **signature-valid replay of the exact Polar
  event records** (session webhook secret — the same key the listener handshake
  installs). Result (scratch DB, verified by psql):
  - `subscription.created` → `Subscription` row (externalId
    `a85a0648-ed79-4000-a286-9bcba2ea3bae`, PRO/ACTIVE, period 09-23→10-23).
  - `order.paid` → `Payment` SUCCEEDED (999, currency **usd**, provider polar,
    idempotencyKey `polar:order:b8f4dcc7…`) + `User` plan=PRO/
    subscriptionStatus=ACTIVE. 3× redelivery → exactly 1 Payment row (idempotent).
  - Currency isolation: `byCurrency` = `{usd:{count:1,total:999}}`, KRW-total
    equivalent = 0 (the USD row is never folded into KRW).
  - Full refund via sandbox API (`POST /v1/refunds`, refund `5e311f08-…`,
    order → `refunded`) then `order.refunded` → `Refund` row (+1 only across
    2× redelivery) + `Subscription` CANCELED + `User` TRIAL/CANCELED (revert).

## Verification record (latest full pass)

`npm run test`: 122 files / 880 tests — PASS. `npm run typecheck` — PASS.
`npm run lint` — 0 errors, 2 pre-existing warnings. `next build` (compile-only)
— PASS with placeholder env (92/92 static pages). `scripts/production-preflight.mjs`
— exit codes 0/1/2 verified on READY / core-missing / partial-billing fixtures.

## Next agent, in order

1. Provide credentials, then:
   `node --env-file=.env.production scripts/production-preflight.mjs --require-billing`
   → `npm run verify:production` in CI → walk `docs/PRODUCTION_CHECKLIST.md`
   "Blocked items" / sections 1–2 (DB backup → migrate:status → migrate deploy
   → Polar sandbox runbook → destructive/SQL review).
2. Decide remaining Phase F scope (PLG referral/waitlist/welcome email) — see
   `docs/HANDOFF.md` "Unbuilt" → then implement in the existing
   feature-folder + config-driven-copy patterns.
3. Wire a real server analytics sink through `capture()`'s transport seam
   when one is wanted (see `docs/ANALYTICS.md`).
4. At deploy: migrate, wire env, Polar smoke test, `next build` in CI.
