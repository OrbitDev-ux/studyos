# STUDYOS — P0 FINAL LAUNCH GATE REPORT

## Final Status

**BLOCKED** — production DB/credentials and production webhook delivery remain.
Sandbox-side closure is complete. **The Polar price-consistency blocker is
RESOLVED** by the $9.99 launch decision (this session): PRO = $9.99 USD / month
is the official catalog and `PLAN_META`/UI/checkout/webhook/analytics were
aligned to it; PREMIUM is not-for-sale.

**BLOCKED AT (production closure run):**

- Production DB migration — `DATABASE_URL`/`DIRECT_URL` MISSING in `.env.production`; identity gate, backup gate, and §10.7 pre-probe cannot run (probe rehearsed on scratch → 0 duplicate rows).
- Production env completeness — preflight exit 1 (CORE MISSING), billing requires the PRO price/product ids in the prod env.
- ~~Production Polar price consistency — FAIL~~ **RESOLVED ($9.99 launch decision, this session)**: one product "StudyOS PRO" @ **$9.99 USD / month** (price `d8aaa433-…`, product `0827b724-…`) IS the official launch product; `PLAN_META` now defines PRO = 999 USD / month, PREMIUM not-for-sale. Remaining: set `POLAR_PRO_PRICE_ID`+`POLAR_PRO_PRODUCT_ID` in prod env and run the §4/§19 read-only id-consistency probe.
- Production webhook registration + real delivery — endpoint `https://<prod-domain>/api/webhooks/polar` needs a production domain (AUTH_URL/SITE_URL unset) and dashboard registration; the `polar listen` session secret must never be reused there.
- Cancel-at-period-end / partial-refund / `subscription.revoked` live lifecycle — unit-tested; not live-verified (no prod webhook transport).
- Deploy + post-deploy smoke — no Vercel project link, no commit of the phase A–K tree yet.

Nothing in this run modified production.

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
| 19 Deployment smoke test                                 | **BLOCKED**                                                     | no production deployment; no Vercel project linked (no `.vercel/`; `vercel.json` present but nothing deployed from this workspace)                                                                                                                                                                                                                                                                                                                                                                   | human: approve deploy + credentials                                   |
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

1. Provide production `DATABASE_URL`/`DIRECT_URL` (+ `AUTH_SECRET`/`AUTH_URL`/`AUTH_GOOGLE_*`/`NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_*`/`GROQ_API_KEY`), then preflight (exit 0) → identity gate → backup gate → §10.7 probe → `prisma migrate deploy` (gates 1/2/3 proof on prod).
2. ~~Decide production Polar pricing~~ **DONE ($9.99 launch decision, this session)**: the production product "StudyOS PRO" @ $9.99 USD/month IS the catalog. Set `POLAR_PRO_PRICE_ID`+`POLAR_PRO_PRODUCT_ID` in the prod env (PREMIUM pair only if a not-for-sale legacy config is wanted) and run the §4/§19 read-only id-consistency probe before the first live checkout.
3. Register `https://<prod-domain>/api/webhooks/polar` with the production `POLAR_WEBHOOK_SECRET` and re-walk the lifecycle live: `order.paid`, cancel-at-period-end, partial refund, `subscription.revoked` (with/without `metadata.userId`), duplicate redelivery.
4. Commit the phase A–K working tree (currently uncommitted on `main`, incl. the 3 canonical migrations) before deploy; run canonical `npm run build` + deploy + post-deploy smoke (gates 17/19).

## Production Audit (this run) — read-only, nothing mutated

- **Env presence**: `.env.production` (git-ignored) contains exactly `POLAR_TOKEN` + `POLAR_WEBHOOK_SECRET`. `POLAR_TOKEN` probed (read-only, value never printed): **production-scoped** (200 `api.polar.sh`, 401 `sandbox-api.polar.sh`), distinct from the sandbox token (hash-compared; no copy). `POLAR_WEBHOOK_SECRET` is `whsec_`-format, distinct from both the `.env.local` stored secret and the CLI session secret. NO sandbox secret is present in the production file — isolation holds (§5 PASS).
- **Preflight**: `node --env-file=.env.production scripts/production-preflight.mjs --require-billing` → **exit 1 (CORE MISSING)**: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID/SECRET`, `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `ADMIN_SESSION_SECRET`, `GROQ_API_KEY`; BILLING partial (4 price/product ids missing). → CORE/BLOCKED.
- **Production Polar orphan audit**: `GET /v1/products` (api.polar.sh) → 1 product: `0827b724-…` "StudyOS PRO", price `d8aaa433-…` usd 999 / month (not archived), no PREMIUM, no KRW. **vs** `PLAN_META` (plans.ts, after the $9.99 launch alignment): PRO = 999 USD / month — **MATCH** ✅; `PLAN_META.PRO.priceKrw` (4,900) is now explicitly legacy Toss-rail only, not the catalog price; PREMIUM `notForSale`. **BILLING PRICE CONSISTENCY = PASS** (code ↔ Polar). Launch still needs the PRO price/product ids present in the prod env (§19 probe).
- **Migrations**: `prisma/migrations/` = 47 dirs; top three below `20260828100000_dev_agent_local_pairing` are exactly the canonical set in order (no drift). Files are **untracked** in git (created this working tree — nothing committed since `ca84aae`).
- **Webhook security re-review** (code): signature verification mandatory + constant-time; missing secret → 500 (retry), bad/missing signature → 401 before any state; unknown event → safe no-op; duplicate → idempotent (unique keys); owner resolution is order/checkout-scoped (customer.external_id → metadata.userId → subscription), all signed-Polar-derived so cross-account mutation is not reachable; no raw-secret logging.
- **Billing state machine re-reviewed** (code): checkout → `order.paid` → `applyPaymentEvent` (create SUCCEEDED Payment + ACTIVE Subscription + `User.plan`/`subscriptionStatus`) → `subscription.canceled/updated` mirrors `cancel_at_period_end` (no entitlement change) → `order.refunded` **full** reverts (Refund + CANCELED + TRIAL), **partial** records money only (`revokeEntitlement:false` kept) → `subscription.revoked` reverts current ACTIVE sub only (fallback to own row, orphan still closed). No policy changed.
- **Refund-duplicate pre-probe** rehearsed on scratch: 0 duplicate `externalRefundId` rows (probe SQL healthy). Live probe pending production DB access.

## Known P1/P2 (non-blocking)

- P1 (deploy-prep): the phase A–K working tree + 3 canonical migrations are uncommitted on `main` — commit/tag before deploy.
- P2: stop-vs-heartbeat race (≤ one 90s interval, few-ms window) — documented, unfixed.
- P2 (cleanup): paid order's `checkout_id` (`0dcac8f8-…`) timestamp vs today's-signup metadata discrepancy — reconcile checkout records in the Polar dashboard (no code impact).
- P1: Polar product/price ids needed in the prod env (PRO pair; PREMIUM optional/not-for-sale) — set in the env + run §19 probe; preflight/billing validate presence. No dashboard change needed.

## Exact Launch Decision

**BLOCKED** — do NOT open the first production checkout until the production
DB migrations are applied (gates 1–3), the production env is complete
(preflight exit 0, including the PRO Polar price/product ids), the production
webhook is registered and live-verified (gates 8–15 on the real account), the
canonical build runs green, and the deploy is smoke-tested. **Pricing is now
decided and aligned ($9.99 USD/month PRO, PREMIUM not-for-sale).** The
remaining blockers are credentials and production-side webhook
registration/delivery only.

## Feature freeze

Preserved. No production-affecting code changed this run; verification harnesses
and evidence docs were updated.

---

## Final P0 Matrix (this session)

| Gate                                   | Environment   | Status                        | Evidence                                                                         | Remaining Action                                                |
| -------------------------------------- | ------------- | ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Prod DB migration                      | PRODUCTION    | **BLOCKED**                   | no `DATABASE_URL`/`DIRECT_URL`; dry-run + post-state verified on scratch (47/47) | provide creds → identity/backup/probe → `prisma migrate deploy` |
| Refund duplicate preflight             | PRODUCTION    | **BLOCKED**                   | probe rehearsed on scratch → 0 dup; live DB unreachable                          | run probe on live DB before migration 2                         |
| RLS / anon boundary                    | PRODUCTION    | BLOCKED (verified on scratch) | 13 tables RLS, 1 carve-out, grants revoked                                       | verify post-deploy                                              |
| Production env completeness            | PRODUCTION    | **BLOCKED**                   | preflight exit 1 (CORE MISSING); billing partial                                 | fill Vercel/target secrets                                      |
| Production Polar product mapping       | PRODUCTION    | **PASS** (mapping)            | one product $9.99 USD == PLAN_META PRO; PREMIUM not-for-sale (ids optional)      | set PRO ids in prod env + §19 probe                              |
| Price consistency (UI/PLAN_META/Polar) | PRODUCTION    | **PASS** (this session)       | UI/`PLAN_META` all show PRO $9.99/month + "출시 예정" for PREMIUM, == Polar       | re-verify after §19 id probe                                    |
| Production webhook registration        | PRODUCTION    | **BLOCKED**                   | domain unset; endpoint unregistered; secrecy isolation verified                  | register + set prod secret                                      |
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
| Deployment                             | PRODUCTION    | **BLOCKED**                   | no `.vercel`, no deploy                                                          | human: approve + link project                                   |
| Post-deploy smoke                      | PRODUCTION    | **BLOCKED**                   | no deploy                                                                        | after deploy, non-destructive smoke                             |
| Anti-cheat / regression                | LOCAL SCRATCH | PASS                          | eligibility + heartbeat race tests green                                         | —                                                               |
