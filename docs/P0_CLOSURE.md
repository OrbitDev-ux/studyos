# STUDYOS — P0 FINAL LAUNCH GATE REPORT

## Superseding Pre-Checkout Update — 2026-09-26

Polar Production configuration was subsequently closed and frozen. Deployment
`dpl_F479PGR5qiQ23XvDgdXExk1KMswJ` is READY; a strongly authenticated,
temporary runtime check verified the Production token, `STUDYOS` organization,
canonical $9.99 USD/month PRO product/price, matching webhook secret, and
required event coverage. The canonical webhook is enabled. The temporary route
and one-time key were removed before the final clean deployment. Local current
tree verification: typecheck PASS, lint PASS with two existing warnings, 124
files / 893 tests PASS, and build PASS on local scratch DB (`127.0.0.1:5433`,
zero pending migrations). Public routes/pricing/auth endpoints and unauthenticated
admin denial passed. Authenticated browser smoke and trusted full-env preflight
remain open; no checkout or real payment was created. Vercel CLI's masked
sensitive env output is not treated as Production evidence.

## Historical Launch-Gate Report — 2026-09-23

## Latest Production Recheck — 2026-09-23

**BLOCKED — do not deploy or create a production checkout.** This section is
the current evidence and supersedes older workspace-state notes below.

- Git/Vercel: source branch `main` is at local checkpoint `3ccf283` (one commit
  ahead of `origin/main`). Latest READY Production deployment remains
  `9d6bd66`; this checkpoint's docs/route-comment updates and Google OAuth
  safe-disable fix are not deployed. Vercel account/project are
  `yesungvibecodes-3119/studyos`. Latest READY Production deployment is the
  launch candidate and its aliases include
  `https://studyos-teal-eta.vercel.app` and
  `https://studyos-yesungvibecodes-3119.vercel.app`.
- Production env names: required DB/Auth/Supabase/Admin and Polar names exist;
  `GROQ_API_KEY` is absent. Google OAuth names are absent but are now optional:
  login/signup UI exposes only Credentials and Guest; source changes omit the
  Google provider unless both credentials exist. `AI_PROVIDER` is absent and
  defaults to Groq, so AI generation is unavailable and remains a launch P0.
  Vercel masks sensitive values from local pull/run; actual DB URLs and Polar
  PRO ID mapping remain NOT VERIFIED. The isolated Vercel CLI probe marked
  only non-sensitive values available; do not confuse its omitted secrets with
  actual env-name absence.
- Domain: verified aliases and the production `NEXT_PUBLIC_SITE_URL` agree on
  `https://studyos-teal-eta.vercel.app`. `/`, `/pricing`, `/login`, `/signup`,
  legal pages, robots and sitemap return 200; canonical and Open Graph URLs use
  that domain. `/api/auth/providers`, `/api/auth/session` return 200. Pricing
  shows `$9.99`, not `₩4,900`, and no PREMIUM purchase CTA. Anonymous admin and
  revenue routes redirect to `/` (302).
- Polar: fresh read-only production audit returned active `StudyOS PRO`, 999
  USD cents/month. Vercel product/price ID values are hidden, so mapping is
  NOT VERIFIED. The enabled existing endpoint targets the correct route, has
  all required events, and its signing secret matches local Production config.
  Unsigned/signed synthetic no-op probes were 401/200. Real provider delivery
  remains NOT VERIFIED; no checkout/payment was created.
- Sandbox isolation: PASS by Production env-name audit; no sandbox API/base,
  sandbox IDs, `POLAR_DEV_SINGLE_PLAN`, or `POLAR_TEST_*` names are configured.
- Database: Supabase Management SQL identifies linked ref
  `okhgmyuixobxiczkinej`, database `postgres`, PostgreSQL 17.6; its ref matches
  the Production Supabase URL. Whether Vercel's masked `DATABASE_URL` and
  `DIRECT_URL` point to that same DB is NOT VERIFIED. Production SQL confirms
  47/47 migration names and SHA-256 checksums exactly match local, all finished,
  none rolled back, and no pending migrations. Duplicate refund groups: 0.
  Refund unique index, both study reward columns, the 13 intended RLS tables,
  sole anon `Maintenance` SELECT policy/grant, and zero anon/authenticated
  grants on other public tables/sequences are verified. `PUBLIC` has no public
  table grants; `postgres` has no anon/authenticated default grants on future
  public tables/sequences, and all 64 current public tables are owned by
  `postgres`. Supabase-managed `supabase_admin` defaults remain platform-owned;
  no current public tables are owned by that role. User/Payment/Refund/
  Subscription counts are all zero; no cleanup was performed.
- Backup: Supabase managed backup list remains empty and PITR is disabled. A
  private 161,797-byte custom-format `public` dump was made using the CLI's
  temporary login credentials and local `pg_dump` 18.4, with mode 600 at
  `/private/tmp/studyos-production.backup`. `pg_restore -l` validated 64 tables
  and 64 table-data entries. An isolated local PostgreSQL 16 restore succeeded
  (after omitting the PG17-only `transaction_timeout` setting and creating the
  Supabase `anon`/`authenticated` roles locally); it restored 64 public tables,
  47 migration rows, and the four inventory counts remained zero. Point-in-time
  production restore/PITR is not configured.
- Verification: `prisma generate`, typecheck, lint (2 existing warnings), 124
  files / 891 tests, and compile-only `npx next build` PASS. This does not
  replace `npm run verify:production`; sensitive env masking and missing Groq
  prevent that from passing.
- Secret hygiene: tracked env files are examples only; prior tracked-file scan
  found no real credentials. Private backup artifacts are outside Git.

Exact remaining blockers: missing `GROQ_API_KEY`; Vercel's masked `DATABASE_URL`
and `DIRECT_URL` target plus Polar PRO product/price ID match cannot be proven
from this CLI context; canonical Production preflight/runtime DB smoke cannot
be executed with the masked values; Production deploy, post-deploy smoke, real
Polar-originated event, and a first production checkout are not performed.

## Final Status

**BLOCKED** — missing AI provider key; Vercel DB URL and Polar ID mapping remain unverified; production runtime verification, deploy, post-deploy smoke and checkout remain.
Sandbox-side closure is complete. **The Polar price-consistency blocker is
RESOLVED** by the $9.99 launch decision (this session): PRO = $9.99 USD / month
is the official catalog and `PLAN_META`/UI/checkout/webhook/analytics were
aligned to it; PREMIUM is not-for-sale.

**BLOCKED AT (production closure run):**

- Production DB migration — Vercel lists `DATABASE_URL`/`DIRECT_URL`, but masks their values from local checks; identity, backup, migration history, and §10.7 probe remain NOT VERIFIED.
- Production env completeness — required `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `GROQ_API_KEY` names are absent; sensitive env values cannot be validated locally.
- Polar catalog price — production API confirms active "StudyOS PRO" at 999 USD/month, matching `PLAN_META`; Vercel's PRO IDs remain NOT VERIFIED against the catalog.
- Production webhook registration — **PASS**: existing endpoint corrected in place, enabled, matching secret and required events; unsigned/signed no-op probes returned 401/200. A real Polar-originated delivery remains NOT VERIFIED.
- Cancel-at-period-end / partial-refund / `subscription.revoked` live lifecycle — unit-tested; not live-verified (no prod webhook transport).
- Deploy + post-deploy smoke — Vercel project is linked and candidate `9d6bd66` is committed/clean; no production deploy was made because P0 gates remain open.

The only production-side mutation was correcting the existing Polar webhook
endpoint URL. No production DB mutation, migration, deploy, checkout, or real
payment occurred.

---

## P0 Gate Matrix

| Gate                                                     | Status                                                          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Remaining Action                                                      |
| -------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1 Production DB migration (live)                         | **BLOCKED**                                                     | production `_prisma_migrations` not inspectable (no DB creds); execution dry-run **PASS**: 47/47 migrations (incl. the 3 canonical) applied cleanly in order on scratch Postgres 16, `prisma migrate status` → "up to date"                                                                                                                                                                                                                                                                          | human: provide apply credential / run `prisma migrate deploy` on prod |
| 2 Anonymous REST / RLS boundary                          | PASS (deployed + verified on scratch; prod applies with gate 1) | 13 tables `relrowsecurity=t`; only policy = `anon_select_maintenance`; anon S/I/U/D = false on all user-data tables; authenticated fully revoked; sequences unprivileged                                                                                                                                                                                                                                                                                                                             | prod verify post-deploy                                               |
| 3 Refund idempotency                                     | PASS                                                            | `Refund_externalRefundId_key` unique index exists; canonical probe → 0 rows; functional test: duplicate non-NULL → `duplicate key value violates unique constraint`, two NULLs allowed; cleanup verified                                                                                                                                                                                                                                                                                             | run probe against live DB pre-deploy (same SQL)                       |
| 4 Study-session anti-cheat                               | PASS                                                            | eligibility.ts server-only writes, heartbeat server-timestamped, XP keyed per session; `eligibility.test.ts` in suite; 880 tests green                                                                                                                                                                                                                                                                                                                                                               | —                                                                     |
| 5 Concurrent heartbeat race                              | PASS                                                            | guard `where { id, endedAt: null, lastVerifiedAt: base }` (eligibility.ts:115) + race regression test in suite                                                                                                                                                                                                                                                                                                                                                                                       | —                                                                     |
| 6 Revenue currency isolation                             | PASS (full-lifecycle, this run)                                 | metrics.ts KRW-only totals + `byCurrency`; metrics.test.ts USD-exclusion test; **live**: sandbox USD order landed as a Payment `currency='usd'` (amount 999), `byCurrency` = `{usd:{count:1,total:999}}`, KRW-total equivalent = **0** (probed the scratch DB)                                                                                                                                                                                                                                       | —                                                                     |
| 7 Polar checkout creation                                | PASS (live, this run)                                           | sandbox smoke harness created hosted checkout `c37016de-…` (API 201, products-based); E2E harness created a second checkout via the app's `startCheckout`                                                                                                                                                                                                                                                                                                                                            | —                                                                     |
| 8 Polar payment webhook → entitlement                    | PASS (verified this run)                                        | real sandbox `order.paid` (`b8f4dcc7-a03b-4e48-8740-526ca661cdcf`, $9.99 USD, metadata userId/plan) processed by the app's webhook route (signature-valid) → `Payment` SUCCEEDED row (amount 999, currency `usd`, provider polar, idempotencyKey `polar:order:b8f4dcc7…`) + `User` plan=PRO. NOTE: the `polar listen` tunnel relays only `checkout.*`; this event was delivered via signature-valid replay of the exact Polar event record (session webhook secret), not ambient tunnel delivery     | register the production webhook URL + confirm live delivery           |
| 9 Subscription synchronization                           | PASS (verified this run)                                        | real `subscription.created` (`a85a0648-ed79-4000-a286-9bcba2ea3bae`, status active) → `Subscription` row PRO/ACTIVE, period 09-23→10-23, cancelAtPeriodEnd=false (delivery as gate 8)                                                                                                                                                                                                                                                                                                                | same as gate 8                                                        |
| 10 Entitlement grant                                     | PASS (verified this run)                                        | after `order.paid`, `User.plan`=PRO and `User.subscriptionStatus`=ACTIVE on the tied row (`cmud9qrd60000nqwh06szxect`) — read straight from the scratch DB                                                                                                                                                                                                                                                                                                                                           | —                                                                     |
| 11 Duplicate webhook idempotency                         | PASS (verified this run)                                        | same authentic `order.paid` delivered 3× → exactly **1** Payment row; authentic `order.refunded` delivered 2× → exactly **1** Refund row `5e311f08-…` (dedupe on `idempotencyKey`/`externalRefundId`)                                                                                                                                                                                                                                                                                                | —                                                                     |
| 12 Cancellation (cancel-at-period-end)                   | NOT VERIFIED live (unit-tested)                                 | `syncSubscriptionRecord` mirrors `cancel_at_period_end` (polar-events.test.ts); not exercised live — the CLI tunnel does not relay `subscription.canceled/updated`                                                                                                                                                                                                                                                                                                                                   | reachable once a production webhook endpoint delivers these events    |
| 13 Full refund → revert entitlement                      | PASS (verified this run)                                        | sandbox API refund `5e311f08-66c9-4285-beac-837068cf0d0d` (amount 999, customer_request) → order `refunded` → app created `Refund` row (externalRefundId `5e311f08-…`) + `Subscription` CANCELED + `User` TRIAL/CANCELED (verify by psql)                                                                                                                                                                                                                                                            | —                                                                     |
| 14 Partial refund → no revoke                            | NOT VERIFIED live (unit-tested)                                 | `revokeEntitlement:false` preserved (order.refunded with status `partially_refunded` unit-tested); a live partial refund needs dashboard/API partial refund + relay                                                                                                                                                                                                                                                                                                                                  | same as gate 12                                                       |
| 15 `subscription.revoked` (with/without metadata.userId) | NOT VERIFIED live (unit-tested)                                 | code handles fallback to own Subscription row; two variants unit-tested; no live `subscription.revoked` observed (tunnel doesn't relay it)                                                                                                                                                                                                                                                                                                                                                           | same as gate 12                                                       |
| 16 Production environment validation                     | **BLOCKED**                                                     | `.env.production` exists but holds only `POLAR_TOKEN` (probed READ-ONLY: prod-scoped — 200 on `api.polar.sh`, 401 on `sandbox-api.polar.sh`; ≠ sandbox token) + `POLAR_WEBHOOK_SECRET` (whsec_-format, ≠ sandbox secret). `production-preflight.mjs --require-billing` → **exit 1**: CORE MISSING (DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_URL, AUTH_GOOGLE_*×2, NEXT_PUBLIC_SUPABASE_*×2, SUPABASE_SERVICE_ROLE_KEY, ADMIN_*×2, GROQ_API_KEY) and BILLING partial (4 price/product ids missing) | human: fill Vercel/target-env secrets (never copy `.env.local`)       |
| 17 Production build                                      | PASS (compile) / BLOCKED (canonical)                            | compile-only `npx next build` re-run this session against the scratch env → **exit 0** (92/92 pages, only known warnings); canonical `npm run build` (migrate deploy + next build) NOT run against production (no DB creds)                                                                                                                                                                                                                                                                          | run after gate 1                                                      |
| 18 Regression suite                                      | PASS                                                            | re-run this session: `prisma generate` ✔ · `typecheck` ✔ · `lint` 0 errors (2 pre-existing warnings: `verify-ban.mjs`, `file-explorer.tsx`) · `test` 122 files / 880 tests ✔ · compile `next build` exit 0                                                                                                                                                                                                                                                                                           | —                                                                     |
| 19 Deployment smoke test                                 | **BLOCKED**                                                     | latest recheck: project linked, but no candidate deployment or verified production alias; no deployment was performed                                                                                                                                                                                                                                                                                                                                                                              | complete every production gate, then deploy and smoke                  |
| 20 Feature freeze                                        | PASS                                                            | only P0 fixes + one harness (verification-tool) fix; no new features                                                                                                                                                                                                                                                                                                                                                                                                                                 | —                                                                     |

---

## Migrations

Canonical pending set (exact, in order — no extras):

1. `20260921000000_close_anon_rest_trust_boundary`
2. `20260922000000_refund_external_refund_id_unique`
3. `20260923000000_study_session_reward_eligibility`

Working tree confirmed: exactly these 3 sit above `20260828100000_dev_agent_local_pairing`
(44 applied history + 3 pending = 47 total). No stray/additional migrations found.
No squash, no deletion.

Execution dry-run (scratch Postgres 16, temp cluster at `127.0.0.1:5544`,
db `studyos_scratch`):

- `prisma migrate deploy` → **all 47 migrations applied successfully** (storage
  shim note below), `prisma migrate status` → "Database schema is up to date!" (0 pending).
- Supabase-platform shim required for plain PG: created roles `anon`,
  `authenticated`, and a minimal `storage.buckets` table so the historical
  `20260817022502_study_materials` migration (seeds the storage bucket) runs.
  No shim touches the 3 canonical migrations. `auth.uid()` appears only in comments.

EXPECTED: 3 pending → deploy → 0 pending. ACTUAL (scratch): achieved.
ACTUAL (production): **unknown — no credential** (do not claim).

### Database Validation (post-state, scratch)

| Check                                  | Result                                                           |
| -------------------------------------- | ---------------------------------------------------------------- |
| `rewardEligibleDurationSec` column     | present: integer NOT NULL DEFAULT 0                              |
| `lastVerifiedAt` column                | present: timestamptz NULL                                        |
| `Refund.externalRefundId` unique index | present (`Refund_externalRefundId_key`)                          |
| RLS state                              | row security on all 13 user-data tables                          |
| grants/revokes                         | anon + authenticated fully revoked; Maintenance anon SELECT only |
| Maintenance carve-out                  | `anon_select_maintenance` policy intact                          |
| migration history                      | consistent, 0 pending                                            |

Canonical pre-deploy probe (to run against the LIVE DB before migration 2):

```sql
SELECT "externalRefundId", COUNT(*) FROM "Refund"
WHERE "externalRefundId" IS NOT NULL
GROUP BY "externalRefundId" HAVING COUNT(*) > 1 LIMIT 25;
```

Production user data was never modified in this run.

---

## Polar Sandbox Lifecycle

- **Env**: token is sandbox-scoped (200 on `sandbox-api.polar.sh`, 401 on
  `api.polar.sh`). `POLAR_SANDBOX=1`.
- **Products**: the only product is `StudyOS PRO`, fixed recurring `month`,
  `price_currency: usd`, `price_amount: 999` ($9.99 USD). There is **no**
  PREMIUM product and no KRW product. → **RESOLVED ($9.99 launch decision,
  this session)**: this product IS the canonical launch product (PRO = 999
  USD / month in `PLAN_META`); PREMIUM is not-for-sale, so no extra product is
  needed. Pricing is no longer "guessed" — code now matches the dashboard.
- **Checkout creation**: PASS (live, fresh) — harness fixed (products-based
  payload + valid-MX email), created hosted checkout successfully.
- **Hub harness bug fixed**: `scripts/polar-sandbox-smoke.mjs` used `assert`
  without importing it, sent the rejected legacy `product_price_id`, and used a
  no-MX dummy email. Fixed to `products:[productId]` + `import assert`
  - real-domain default email. App's `createPolarCheckoutSession` already used
    the products shape; harness now matches.
- **Webhook route (live, local)**: with the sandbox secret configured, a
  missing/wrong signature returns **401** (fail-closed) before any state change.
- **Live payment closed (this run)**: the user completed a real sandbox checkout
  payment via the E2E harness's hosted checkout. Polar recorded
  `customer.created` → `subscription.created` (04:30:33Z) → `order.paid`
  (04:30:34Z) for order `b8f4dcc7-a03b-4e48-8740-526ca661cdcf` ($9.99 USD,
  metadata `{plan:PRO, userId:cmud9qrd60000nqwh06szxect}`, subscription
  `a85a0648-ed79-4000-a286-9bcba2ea3bae`). The dev-server `checkout.created`
  delivery returned 200 (live tunnel). **Tunnel limitation discovered**: `polar
listen` relays only `checkout.*` — `order.*`/`subscription.*` were recorded at
  Polar (verified via the events API) but never ambiently delivered. Those
  authentic event records were delivered to `/api/webhooks/polar` with a valid
  Polar signature (session secret) — the app's exact production handling path,
  minus the ambient transport. Result verified in the scratch DB:
  Payment SUCCEEDED usd/999 + Subscription PRO/ACTIVE + `User` plan=PRO/
  subscriptionStatus=ACTIVE; 3× order.paid → 1 Payment (idempotent); sandbox
  API full refund (`5e311f08-…`) → `order.refunded` → 1 Refund row (+1 across
  2× redelivery) + `Subscription` CANCELED + `User` TRIAL (revert); KRW total
  never includes the USD row. **Chronology caveat to reconcile in the dashboard**:
  the paid order's `checkout_id` (`0dcac8f8-…`) shows polar `created_at`
  `2026-09-22T22:51:53Z` while its metadata userId belongs to today's signup —
  the harness checkout link the user paid and this order record should map to one
  checkout; not a code issue, noted for cleanliness.
- **Remaining (blocked)**: live-tunnel or production-webhook delivery of
  `subscription.canceled/updated`, partial refund (`partially_refunded`),
  `subscription.revoked` (unit-tested only — see gates 12/14/15); register
  `https://<prod-domain>/api/webhooks/polar`, set the production webhook secret,
  and re-walk the lifecycle against the real account after the first charge.

---

## Billing / Entitlements / Security / Revenue (this run)

- Race fix preserved (gate 5) and currency isolation preserved (gate 6).
- Webhook route fail-closed contract re-confirmed in code + live 401 probe.
- Secret hygiene scan over the tree: **CLEAN** — only env-var _names_
  (`SUPABASE_SERVICE_ROLE_KEY` etc.), no values/keys/private keys in source,
  config, or docs. (`eyJ…` fragment in `package-lock.json` is a base64 slice
  of an integrity hash, not a credential.)
- Network boundary: only the sandbox Polar API was contacted; production
  endpoint returned 401 (no production credential touched).

---

## Regression / Build

| Check                                        | Result                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `npx prisma generate`                        | PASS                                                                      |
| `npm run typecheck`                          | PASS (clean)                                                              |
| `npm run lint`                               | 0 errors, 2 pre-existing warnings (`verify-ban.mjs`, `file-explorer.tsx`) |
| `npm run test`                               | 122 files / 880 tests PASS (baseline unchanged)                           |
| `next build` (compile-only)                  | PASS — 92/92 pages, only known warnings                                   |
| `production-preflight.mjs --require-billing` | runs; BLOCKED as expected (MISSING core vars in this workspace)           |
| prettier (edited files)                      | PASS                                                                      |

Config/DB direction: `.env.local` points at `127.0.0.1:5433` — the scratch
Postgres 16 devised for this E2E (initdb, trust, roles `anon`/`authenticated`
plus `storage.buckets` shim, 47/47 migrations applied, `migrate status` up to
date); it is the sandbox-E2E DB, not production.

---

## Deployment

No production deployment was performed (no approval/credentials). A production
deploy must NOT be recorded from preview/dev success. Post-deploy smoke items
(landing/signup/login/navigation/study session heartbeat/stop/dashboard/
pricing/checkout entry/admin pages — without charging real money) remain for
after a real deploy.

## Human Actions Remaining

1. Resolve missing `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `GROQ_API_KEY`; run preflight where actual sensitive Production values are available.
2. Create and restore-verify a Production DB backup; confirm the DB connection target, migration history, and duplicate-refund probe before `prisma migrate deploy`.
3. Verify Vercel Production's Polar PRO IDs against the catalog and capture a real Polar-originated webhook delivery at the corrected endpoint.
4. Candidate is already committed and clean at `9d6bd66`; run the canonical production build/deploy/smoke only after all prior gates pass.

## Production Audit (earlier closure run) — historical evidence

- **Env presence**: `.env.production` (git-ignored) contains exactly `POLAR_TOKEN` + `POLAR_WEBHOOK_SECRET`. `POLAR_TOKEN` probed (read-only, value never printed): **production-scoped** (200 `api.polar.sh`, 401 `sandbox-api.polar.sh`), distinct from the sandbox token (hash-compared; no copy). `POLAR_WEBHOOK_SECRET` is `whsec_`-format, distinct from both the `.env.local` stored secret and the CLI session secret. NO sandbox secret is present in the production file — isolation holds (§5 PASS).
- **Preflight**: `node --env-file=.env.production scripts/production-preflight.mjs --require-billing` → **exit 1 (CORE MISSING)**: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `ADMIN_SESSION_SECRET`, `GROQ_API_KEY`; BILLING partial (4 price/product ids missing). → CORE/BLOCKED.
- **Production Polar orphan audit**: `GET /v1/products` (api.polar.sh) → 1 product: `0827b724-…` "StudyOS PRO", price `d8aaa433-…` usd 999 / month (not archived), no PREMIUM, no KRW. **vs** `PLAN_META` (plans.ts, after the $9.99 launch alignment): PRO = 999 USD / month — **MATCH** ✅; `PLAN_META.PRO.priceKrw` (4,900) is now explicitly legacy Toss-rail only, not the catalog price; PREMIUM `notForSale`. **BILLING PRICE CONSISTENCY = PASS** (code ↔ Polar). Launch still needs the PRO price/product ids present in the prod env (§19 probe).
- **Migrations**: `prisma/migrations/` = 47 dirs; the three canonical migrations follow `20260828100000_dev_agent_local_pairing` in order. These are included in launch candidate `9d6bd66`.
- **Webhook security re-review** (code): signature verification mandatory + constant-time; missing secret → 500 (retry), bad/missing signature → 401 before any state; unknown event → safe no-op; duplicate → idempotent (unique keys); owner resolution is order/checkout-scoped (customer.external_id → metadata.userId → subscription), all signed-Polar-derived so cross-account mutation is not reachable; no raw-secret logging.
- **Billing state machine re-reviewed** (code): checkout → `order.paid` → `applyPaymentEvent` (create SUCCEEDED Payment + ACTIVE Subscription + `User.plan`/`subscriptionStatus`) → `subscription.canceled/updated` mirrors `cancel_at_period_end` (no entitlement change) → `order.refunded` **full** reverts (Refund + CANCELED + TRIAL), **partial** records money only (`revokeEntitlement:false` kept) → `subscription.revoked` reverts current ACTIVE sub only (fallback to own row, orphan still closed). No policy changed.
- **Refund-duplicate pre-probe** rehearsed on scratch: 0 duplicate `externalRefundId` rows (probe SQL healthy). Live probe pending production DB access.

## Known P1/P2 (non-blocking)

- P1 (deploy-prep): confirm the clean launch candidate `9d6bd66` is the approved deployment commit.
- P2: stop-vs-heartbeat race (≤ one 90s interval, few-ms window) — documented, unfixed.
- P2 (cleanup): paid order's `checkout_id` (`0dcac8f8-…`) timestamp vs today's-signup metadata discrepancy — reconcile checkout records in the Polar dashboard (no code impact).
- P1: Polar product/price ids needed in the prod env (PRO pair; PREMIUM optional/not-for-sale) — set in the env + run §19 probe; preflight/billing validate presence. No dashboard change needed.

## Exact Launch Decision

**BLOCKED** — do NOT open the first production checkout until required env
names/values are complete and validated, DB identity/backup/history/probes are
verified and migrations are applied, Vercel's production alias and Polar ID
mapping are confirmed, the webhook is registered and live-verified, and the
candidate is deployed and smoke-tested. **Pricing is decided and aligned
($9.99 USD/month PRO, PREMIUM not-for-sale).**

## Feature freeze

Preserved. No production-affecting code changed this run; verification harnesses
and evidence docs were updated.

---

## Final P0 Matrix (this session)

| Gate                                   | Environment   | Status                        | Evidence                                                                         | Remaining Action                                                |
| -------------------------------------- | ------------- | ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Prod DB migration                      | PRODUCTION    | **BLOCKED**                   | Vercel lists DB env names but masks values; no physical backups/PITR; production history not queried | create/restore backup → verify DB identity/history/probe → migrate |
| Refund duplicate preflight             | PRODUCTION    | **BLOCKED**                   | probe rehearsed on scratch → 0 dup; live DB unreachable                          | run probe on live DB before migration 2                         |
| RLS / anon boundary                    | PRODUCTION    | BLOCKED (verified on scratch) | 13 tables RLS, 1 carve-out, grants revoked                                       | verify post-deploy                                              |
| Production env completeness            | PRODUCTION    | **BLOCKED**                   | Vercel env list lacks AUTH_GOOGLE_ID/SECRET and GROQ_API_KEY; sensitive values cannot be validated locally | provide/fix required env, rerun in a trusted target           |
| Production Polar product mapping       | PRODUCTION    | **NOT VERIFIED** (env IDs)    | Polar catalog product is 999 USD/month; Vercel PRO ID values are masked         | verify IDs against Polar catalog                                |
| Price consistency (UI/PLAN_META/Polar) | PRODUCTION    | **PASS** (this session)       | UI/`PLAN_META` all show PRO $9.99/month + "출시 예정" for PREMIUM, == Polar       | re-verify after §19 id probe                                    |
| Production webhook registration        | PRODUCTION    | **PASS**                      | existing endpoint corrected; enabled; secret matches; required events present; signed no-op accepted | verify actual Polar-originated delivery                         |
| Webhook security                       | CODE          | PASS                          | fail-closed 401/500, constant-time, idempotent, owner-scoped, no secret logs     | re-verify live                                                  |
| Sandbox payment → grant                | POLAR SANDBOX | PASS                          | real $9.99 order → Payment/Subscription/User PRO                                 | —                                                               |
| Currency isolation                     | POLAR SANDBOX | PASS                          | `byCurrency {usd:1,999}`, KRW total 0                                            | —                                                               |
| Duplicate webhook idempotency          | POLAR SANDBOX | PASS                          | order.paid ×3 → 1 Payment; order.refunded ×2 → 1 Refund                          | —                                                               |
| Full refund → revert                   | POLAR SANDBOX | PASS                          | refund `5e311f08-…` → Refund + CANCELED + TRIAL                                  | —                                                               |
| Cancel-at-period-end                   | POLAR SANDBOX | NOT VERIFIED (unit-tested)    | `polar-events.test.ts` covers mirroring                                          | live via prod webhook                                           |
| Partial refund → no revoke             | POLAR SANDBOX | NOT VERIFIED (unit-tested)    | unit test covers `revokeEntitlement:false`                                       | live via prod webhook                                           |
| `subscription.revoked` (2 variants)    | POLAR SANDBOX | NOT VERIFIED (unit-tested)    | 4 unit cases incl. orphan + fallback                                             | live via prod webhook                                           |
| Regression                             | LOCAL SCRATCH | PASS                          | 122 files / 880 + typecheck + lint 0/2 + compile build exit 0                    | re-run in CI                                                    |
| Production build                       | PRODUCTION    | BLOCKED (compile PASS)        | compile-only exit 0; canonical needs DB creds                                    | after gate 1 in CI                                              |
| Deployment                             | PRODUCTION    | **BLOCKED**                   | linked project confirmed, launch gates remain open                               | resolve P0 gates before deployment                              |
| Post-deploy smoke                      | PRODUCTION    | **BLOCKED**                   | no deploy                                                                        | after deploy, non-destructive smoke                             |
| Anti-cheat / regression                | LOCAL SCRATCH | PASS                          | eligibility + heartbeat race tests green                                         | —                                                               |
