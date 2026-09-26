# Production Revenue Readiness — Go-Live Checklist

Version pre-first-charge. Work the "Deploy" section first (migrations + build),
then Polar, then observability. **Do not** open checkouts to real traffic until
the sandbox step passes end-to-end.

## Current Pre-Checkout State — 2026-09-26

**POLAR CONFIGURATION CLOSED/FROZEN.** Production runtime verifies the intended
`STUDYOS` organization, $9.99 USD/month PRO product/price, matching webhook
secret, required events, and enabled canonical endpoint. Deployment
`dpl_F479PGR5qiQ23XvDgdXExk1KMswJ` is READY. Public pricing/auth routes and
unauthenticated admin denial passed. Local regression is 124 files / 893 tests;
typecheck, lint, and local scratch-DB build passed. No real payment was made.

Still open before first checkout: authenticated dashboard and harmless AI smoke,
trusted canonical production preflight, and one hosted PRO checkout review.
Vercel CLI masks sensitive values; its `env run` missing-value result is not
evidence that Production secrets are missing. The preflight implementation only
checks presence and does not print or compare secret values. Previous blocked
Polar observations below are historical, superseded by this section.

Legend: ☐ pending · ☑ verified · ⛔ blocked (reason at bottom).

## Historical Production Recheck — 2026-09-23

**BLOCKED.** Current evidence is in `docs/P0_CLOSURE.md`. The target is
`yesungvibecodes-3119/studyos`; `studyos-teal-eta.vercel.app` is an alias of
the latest READY Production deployment, and public/canonical URLs match it.
Vercel Production lacks `GROQ_API_KEY`; Google OAuth IDs are absent but are
safe-disabled (not required by the current login/signup UI). Sensitive env
values are masked from local CLI, so the actual Vercel DB connection target
and Polar product/price ID mapping remain NOT VERIFIED. Polar catalog and
webhook configuration are verified; provider-originated delivery is not.
Production DB SQL confirms all 47 migrations/checksums match local, zero
pending, duplicate-refund count zero, the expected RLS/grants/index/columns,
and zero users/payments/refunds/subscriptions. A private dump and isolated
restore drill PASS; managed backup listing is empty and PITR is disabled.
The only anon table privilege is Maintenance SELECT; postgres-owner default
table/sequence grants for anon/authenticated are revoked.
No Production DB mutation, deploy, checkout, or payment was performed.

---

## 1. Database (the migrations)

Deploy day, in this exact order. **Never run `prisma migrate deploy` against an
unverified DATABASE_URL.**

### Canonical pending-migration set (EXPECTED)

EXPECTED: exactly **THREE** pending migrations, applied strictly in this order:

1. `20260921000000_close_anon_rest_trust_boundary` — revoke anon/authenticated
   grants, RLS on user-data tables, `Maintenance` SELECT carve-out.
2. `20260922000000_refund_external_refund_id_unique` — unique index on refund
   external ids (idempotency).
3. `20260923000000_study_session_reward_eligibility` — `StudySession`
   `rewardEligibleDurationSec` + `lastVerifiedAt` (+ backfill).

ACTUAL: **zero pending**. A read-only Supabase Management SQL audit confirmed
47/47 production migration names match the local directory, all completed,
none rolled back, and SHA-256 checksums match exactly. The three expected
migrations are already applied in order. Vercel's masked DB URL values mean
the app's own runtime connection target is still not independently verified.

1. [ ] ☐ **Confirmation** — linked Supabase project ref is
       `okhgmyuixobxiczkinej`, database `postgres`, PostgreSQL 17.6. It matches
       the configured Supabase URL; separately verify Vercel's masked
       `DATABASE_URL`/`DIRECT_URL` target before any runtime DB action.
2. [x] ✅ **Backup / recovery** — `/private/tmp/studyos-production.backup`
       is a mode-600, 161,797-byte custom-format public-schema dump. Archive
       listing validates 64 tables and data entries; isolated local restore
       restored 64 tables and 47 migration rows with inventory counts matching
       production. Managed physical backups remain empty and PITR disabled.
3. [x] ✅ **Migration history review** — exact 47 local/production names,
       checksums identical, 47 finished, zero failed/rolled back.
4. [x] ✅ **Pending check** — zero pending. The expected three latest
       migrations are already applied in order; do not run migrate deploy.
5. [ ] ☐ **Destructive SQL review** — the pending migrations REVOKE grants on
       the `public` schema, enable RLS on 12 tables, add a single `Maintenance`
       SELECT carve-out, add a unique index on refund external ids, and add
       `rewardEligibleDurationSec`/`lastVerifiedAt` (+ backfill) to
       `StudySession`. There are NO drops/renames of columns or tables.
       Re-`git diff` the migration files against what ships to be sure.
6. [x] ✅ **Pre-deploy duplicate check** — the production read-only probe found
       zero duplicate non-NULL external refund IDs. The query + data fix plan from
       `docs/PRODUCTION_CHECKLIST.md` §10.7 (see "duplicate refund external ids"
       probe in the audit notes) so `migration 2`'s unique index cannot fail on
       legacy duplicates.
7. [ ] ⛔ **Deploy** — blocked by missing Production `GROQ_API_KEY`, masked
       DB target / Polar ID mapping, and incomplete canonical production
       verification. Do not run `npm run build` because it applies migrations.
8. [ ] ☐ **Post-deploy smoke** — a real (non-admin) login works; anon REST
       call on a user-data table returns empty/denied (RLS holds); the
       `Maintenance` app-gate toggle still reads via the anon carve-out; the
       billing routes respond (enabled → checkout page, or fail-closed if unset).

If step 5 shows anything unexpected, STOP and restore from the step-2 backup
(see "Migration failure" in the runbook below) — do not proceed to deploy.

## 2. Polar (billing provider of record)

- [ ] ☐ Polar organization created, **sandbox** checked out first.
- [ ] ☐ `POLAR_TOKEN`, `POLAR_PRO_PRICE_ID`, `POLAR_PREMIUM_PRICE_ID`,
      `POLAR_PRO_PRODUCT_ID`, `POLAR_PREMIUM_PRODUCT_ID`,
      `POLAR_WEBHOOK_SECRET` set per environment — server-side only,
      **never** `NEXT_PUBLIC_*` (full contract table: `docs/BILLING_POLAR.md`).
- [ ] ☑ Sandbox end-to-end: `node --env-file=.env.local
scripts/polar-sandbox-smoke.mjs` — create checkout, complete the test
      card payment, observe `order.paid` grant. **Verified this session (real
      $9.99 USD sandbox payment)**: `order.paid`/`subscription.created` →
      Payment SUCCEEDED (currency `usd`)/Subscription/entitlement, idempotent
      redelivery, full-refund revert. Caveat: the `polar listen` CLI tunnel
      relays only `checkout.*` — the order/subscription events were delivered to
      `/api/webhooks/polar` via signature-valid replay of the exact Polar event
      records. Live transport to a deployed webhook URL must still be confirmed.
- [x] ✅ Production Polar product = canonical catalog product (read-only audit +
      recon): "StudyOS PRO" @ **$9.99 USD / month** (price `d8aaa433-…`,
      product `0827b724-…`, not archived) IS the official launch product.
      **$9.99 launch decision (2026):** `PLAN_META` now defines PRO = 999 USD /
      month; PREMIUM is NOT for sale (`notForSale`) with its checkout failing
      closed. The four `POLAR_*_PRICE_ID`/`POLAR_*_PRODUCT_ID`: only the PRO
      pair is required; PREMIUM pair is optional/expected-empty. Vercel has
      both PRO ID variable names, but values are masked, so their catalog
      mapping remains NOT VERIFIED.
- [x] ✅ Existing Polar endpoint corrected in place to
      `https://studyos-teal-eta.vercel.app/api/webhooks/polar`, enabled with
      the matching secret and required event coverage. Unsigned/signed
      synthetic no-op probes returned 401/200; real Polar-originated delivery
      remains NOT VERIFIED.
- [ ] ☐ Confirm partial refunds record without revoking access, full refunds
      revert to TRIAL, `subscription.revoked` reverts even without
      `metadata.userId`, and dedupe survives redelivery.
- [ ] ☐ Rotate test: wrong webhook secret ⇒ 401 with zero state change;
      missing secret ⇒ 500 (Polar retries ~3 days).

## 3. Environment / deploy

- [ ] ☐ `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
      `AUTH_SECRET`, `DATABASE_URL` — verify they match the target env.
- [ ] ☐ `SITE_URL` per environment (used in the checkout `success_url`).
- [ ] ☐ Do not copy prod Polar secrets into dev/.env.local; the shared
      `POLAR_TOKEN` account is gated down (Polar grants are account-scoped).
- [ ] ☐ `.env.example` kept in sync with every variable the code reads.

## 4. Vercel / deployment topology

- [ ] ☐ `npm run build` green in CI (runs migration + Next build). If a branch
      deploy must not migrate, gate the migrate step separately.
- [ ] ☐ Cron `/api/cron/billing-renewals` (schedule `0 0 * * *`, region etc.)
      verified in the dashboard — today it's a no-op safety net for Toss rows;
      Polar renewals are handled by Polar itself.
- [ ] ☐ `vercel.json` region/`crons` reviewed (`middleware`/`_middleware.ts`
      parity: auth, maintenance, security headers).
- [ ] ☐ Webhook endpoints are reached over public HTTPS:
      `/api/webhooks/polar`, `/api/webhooks/toss`.

## 5. Webhooks & payments (behavioral)

- [ ] ☐ `/api/webhooks/polar` fail-closed contract holds in the deployed env.
- [ ] ☐ `/api/webhooks/toss` re-fetches authoritative payment before acting
      (Toss doesn't sign payloads) and ignores CANCELED for unknown payments.
- [ ] ☐ `/billing/callback` shows the correct banner (ownership-checked) and
      never grants on redirect.
- [ ] ☐ Charge flow for PRO matches the `POLAR_PRO_PRICE_ID` product (999 USD,
      monthly); a currency/amount mismatch is a **warning bell** for the wrong
      product. PREMIUM has no charge flow (not-for-sale; its checkout fails
      closed).
- [ ] ☐ Idempotency on duplicate form submits / retried webhooks proven via
      `payment`/`refund` unique keys.

## 6. Entitlements & user experience

- [ ] ☐ All gates route through `accessStateFor`/`canUseFeature`/
      `getFeatureLimit`/`withGenerationQuota` — no stray `plan === "PRO"`
      checks outside `features/billing` (audited, see IMPLEMENTATION_TRACKER).
- [ ] ☐ Grace window: dunning/past-due keeps access; only after the grace
      period does the renewal cleanup revert to TRIAL.
- [ ] ☐ `/profile` shows real subscription state (reads the DB, not the
      callback banner), so webhook-delay is invisible to the user beyond a
      brief lag.

## 7. Analytics & revenue funnel

- [ ] ☐ `pricing_viewed → signup_completed → checkout_started →
charge_succeeded` all fire (catalog in `docs/ANALYTICS.md`).
- [ ] ☐ `/admin/revenue` (SUPER_ADMIN) shows live numbers derived from the DB;
      the Polar dashboard remains the money ledger of record.
- [ ] ☐ No PII/free-text in event props; events never throw.

## 8. Security

- [ ] ☐ Admin revenue page + nav gated by `requireCapability("manageSystem")`.
- [ ] ☐ `startCheckout` requires a session; callback checks conquest ownership + customerKey match before charging.
- [ ] ☐ Secrets never in client bundles (no `NEXT_PUBLIC_POLAR_*`; grep the
      built bundle before launch).

## 9. Rollback

- [ ] ☐ Degrade path: unset `POLAR_TOKEN`/price ids ⇒ checkouts disabled
      (`isCheckoutUsable()` false), existing subscriptions keep their recorded
      entitlement until they lapse — no silent charge.
- [ ] ☐ Full refund / cancel-at-period-end returns the user to TRIAL cleanly.
- [ ] ☐ Keep the previous successful build's URL/id handy; Vercel instant
      rollback if a production webhook mishandles events.

## 10. Failure / rollback runbook

Golden rule: **never mutate to fix a problem created by a crash** — diagnose,
contain, then correct with the smallest write. Data-loss order of operations
is always: read-only inspect → stop-the-bleeding (disable checkout / ignore
webhook) → surgical fix → re-verify.

### 10.1 Migration failure

- Contain: nothing you build depends on it yet — billing rows keep flowing to
  the old schema (all three pending migrations are additive: REVOKE grants +
  RLS, a unique index, and new columns with a backfill). No new grants were
  added, so **no data was written by the migrations**; a failed `migrate
deploy` is atomic per-file (Prisma rolls the transaction back).
- Diagnose: read the error (permission vs lock vs connection); rerun
  `npm run migrate:status` to confirm the DB still matches the last applied.
- Recover: fix the cause (grant, lock wait, pooled vs direct `DIRECT_URL`),
  rerun `migrate:deploy`. It is safe to run repeatedly — Prisma only applies
  the missing file.
- If a migration somehow PARTIALLY applied with a dropped column/table
  (not our case today): restore the step-2 snapshot, redeploy the previous
  build, and re-plan.

### 10.2 Webhook failure (Polar/Toss not sticking)

- Observations: users paid but stayed TRIAL, or access granted without charge.
- Contain: webhooks are fail-closed by design (401/500 → retry ~3 days, no
  silent drop). Check the route logs; if a bad `POLAR_WEBHOOK_SECRET` is the
  cause, fix env and let retries land — do NOT hand-write user rows.
- Recover: the event's webhook retry queue replays. If Polar's retries are
  exhausted, visit the order in Polar and re-trigger, or record the payment
  through the ADMIN override path only as a last resort and log it in
  `AuditLog`. Prefer any path keyed by the original idempotency key.
- Validate: one user, end-to-end: `order.paid` → SUCCEEDED Payment →
  ACTIVE Subscription → PRO.

### 10.3 Polar checkout failure (user can't pay)

- Symptoms: `startCheckout` returns an error, or the hosted URL 500s.
- Diagnose: env missing (price ids / token) → pricing CTA already disabled
  (fail-closed) — that's the SAFE state, not a bug; `/admin/revenue` also
  reports MISSING billing envs.
- Recover: fix env values, rerun preflight
  (`npm run verify:production`, which gates on billing config); no user data
  to migrate. If the Polar account ran out of test credits in sandbox, the
  harness prints a clear non-2xx body.

### 10.4 Entitlement mismatch (PRO but blocked, or TRIAL with access)

- Contain: entitlement is derived ({user.plan, user.subscriptionStatus} + the
  ACTIVE Subscription row). Never hand-edit to "fix" — first read.
- Diagnose: which source disagrees? Check the Subscription row (status,
  `currentPeriodEnd`), the User row, and the latest webhook event; the grace
  window intentionally keeps access during dunning — confirm the dates.
- Recover: cancel-at-period-end / refund / revoked webhooks all converge
  correctly (tested); for a genuinely stuck row, end the subscription via its
  own provider path (Polar dashboard revoke or profile cancel) and let the
  webhook flip the DB. Audit-log any override.
- If entitlement says TRIAL but the user has a current subscription:
  re-sync by re-delivering the provider's event (Polar webhook test button).

### 10.5 Broken production build

- Contain: rollout is feature-frozen; if a deploy is broken, Vercel
  instant-rollback to the previous build ID (kept in section 9). Do not
  "hotfix" live.
- Recover: reproduce locally with `npm run verify:production`; fix the code;
  redeploy through the normal gate. Billing is unaffected while you do this —
  old build served.

### 10.6 Revenue metrics anomaly

- Symptoms: `/admin/revenue` numbers look wrong (e.g. negative net, a sum that
  doesn't match the Polar dashboard, sudden new-payer spike).
- Diagnose FIRST, before any assumption: the module is read-only. Check
  (1) accounting assumptions: all rows KRW, no foreign-currency Payment row;
  (2) period boundary: UTC month, not KST; (3) a duplicate grant isn't
  double-counting — idempotency keys make that impossible unless a row was
  seeded manually; (4) the reference: Polar dashboard is authoritative.
- Recover: fix the DATA problem (e.g. a non-KRW row or a hand-seeded payment),
  not the metric code. If the code is wrong, change + test `metrics.ts`, then
  run `npm run verify:production`.

### 10.7 Duplicate refund external ids (pre-deploy probe for migration 2)

- Why: `20260922000000_refund_external_refund_id_unique` creates a UNIQUE index
  on `Refund.externalRefundId`. If legacy rows already share an
  `externalRefundId` (e.g. from a double-recorded refund or a hand-seeded
  row), the `CREATE UNIQUE INDEX` fails and migration 2 cannot apply. This is
  a PRE-DEPLOY concern, not a failure that needs the backup restore path.
- Read-only probe (run before `migrate:deploy`, against the deploy DB):
  ```sql
  -- migrate:status must show 20260922...00000 as the LAST APPLIED; then run:
  SELECT "externalRefundId", COUNT(*) FROM "Refund"
  GROUP BY "externalRefundId"
  HAVING COUNT(*) > 1
  LIMIT 25;
  ```
  Zero rows → migration 2 is safe to apply.
- If duplicates exist (diagnose FIRST, no mutation): inspect the duplicate
  rows (id, externalRefundId, paymentId, refundedAt, amountMinor). Decide per
  case whether it's (a) a genuine double-record — keep/merge the authoritative
  row and null-out/dedupe the duplicate's `externalRefundId` (making it
  nullable-friendly to the unique index), or (b) a hand-seeded test row — flag
  for cleanup. Correct with the smallest write and log it in `AuditLog`.
- Contain/recover: because migration stays pending while you fix data, the DB
  stays on the last-applied migration with zero impact on running code; rerun
  `migrate:deploy` once clean. This path never involves restoring a snapshot
  unless other migration steps already ran.

## 11. Launch blocker classification

### P0 — LAUNCH BLOCKER (must be green before the first real checkout)

- [ ] Real **database migration** verified against production — all THREE
      pending files applied cleanly in order
      (`20260921000000_close_anon_rest_trust_boundary` →
      `20260922000000_refund_external_refund_id_unique` →
      `20260923000000_study_session_reward_eligibility`) — BLOCKED (no DB
      creds; §10.7 probe not yet run on the live DB; static audit: PASS in
      `docs/P0_CLOSURE.md` §2).
- [ ] **Polar sandbox lifecycle** verified end-to-end (checkout → webhook →
      entitlement → cancel/refund) — **partially BLOCKED**: payment→grant→
      refund verified against the real sandbox; cancel-at-period-end / partial
      refund / `subscription.revoked` await live webhook delivery (see §12).
- [ ] **Production build + preflight** run for real in CI/on the target env
      (`npm run verify:production`) — BLOCKED (no env).
- [ ] **Webhook** registered at the production domain with matching secret.
- [ ] Billing env contract complete (all 4 Polar vars; partial config is a
      P0 condition too — it 500s on live clicks).

### P1 — POST-LAUNCH (safe to ship; do soon after first charge)

- [ ] **Server analytics sink**: `capture()` is dev-log/no-op server-side;
      funnel conversion across both sinks is gated on it
      (`docs/ANALYTICS.md`).
- [ ] **Order-paid-after-refund guard**: an out-of-order delayed `order.paid`
      webhook (arriving after its `order.refunded`) could re-grant access for
      a refunded order. Entry-ticket: fetch the Polar order at grant time and
      skip when refunded. Documented in `polar-events.ts`.
- [ ] PLG surface decision (referral/waitlist/welcome email) — product scoping,
      unrelated to correctness.

### P2 — OPTIONAL (nice-to-have, never blocks)

- [ ] MRR number in `/admin/revenue` (formula defined in `metrics.ts`; schema
      already supports it) — today the module reports collected revenue.
- [ ] `/admin/revenue` per-month breakdown table / export.
- [ ] Revenue page unit test for the page wiring (authorization itself is
      covered by `context.test.ts` + `permissions.test.ts`).

## 12. Final gate (before first real checkout is opened)

- [ ] ☐ `npm run verify:production` — typecheck → lint → tests → env preflight
      (`scripts/production-preflight.mjs --require-billing`) → compile-only
      `next build`. This command never runs migrations or billing mutations.
      (Local typecheck/lint/tests/compile build PASS. Vercel masks sensitive
      values from local `env run`; actual preflight against all secrets remains
      NOT VERIFIED, and three required Production env names are absent.)
- [ ] ⛔ Migrations now evidence-verified on a scratch Postgres 16 (47/47 apply,
      0 pending, RLS/grants/columns/index probed, refund-unique functionally
      tested) — still needs the **live production** apply to be recorded.
- [ ] ⛔ Polar sandbox lifecycle largely **verified** (payment → grant →
      idempotent redelivery → full-refund revert; currency isolation). Remaining:
      live delivery of cancel-at-period-end, partial refund (no-revoke),
      `subscription.revoked` (the CLI tunnel relays only `checkout.*`).
- [x] ✅ Polar products = official launch catalog: ONE product "StudyOS PRO" @
      **$9.99 USD / month** (price `d8aaa433-…`), which is exactly the new
      canonical `PLAN_META` PRO (999 USD). No PREMIUM/KRW product needed
      (PREMIUM not-for-sale). Re-verify PRO price id mapping at §19 before the
      first production charge.

Gate state as of the latest recheck is consolidated in `docs/P0_CLOSURE.md`
(status: `BLOCKED` — missing Groq Production key; Vercel-masked DB target and
Polar PRO ID mapping; canonical runtime preflight/DB health, deployment and
post-deploy smoke remain. Production migration history/RLS/refund probe and a
private dump/restore drill now pass; managed backups/PITR remain off. Catalog
pricing is aligned and the webhook endpoint is correctly configured).

---

## Blocked items (why, and what unblocks them)

- **Production env/runtime**: `GROQ_API_KEY` is absent and AI generation is a
  launch-critical capability. Google OAuth IDs are absent but safe-disabled by
  the reviewed source fix; the login/signup UI exposes Credentials/Guest only.
  Vercel masks sensitive values, so privately verify `DATABASE_URL` and
  `DIRECT_URL` target Supabase ref `okhgmyuixobxiczkinej`, then run canonical
  verification and a read-only app DB health check. Do not share values.
- **Production DB / backup**: all 47 migration checksums match local, zero
  pending; RLS/grants, refund unique index/zero duplicate probe and reward
  columns pass. Private public-schema dump and isolated restore drill pass.
  Supabase-managed backups/PITR are still disabled. Do not run migrations.
- **Polar production pricing (RESOLVED — $9.99 launch decision, this
  session)**: production org has ONE product "StudyOS PRO" @ $9.99 USD/month
  (price `d8aaa433-…`). The operator decision is now FINAL: **PRO = $9.99 USD /
  month is the production catalog**; PREMIUM not-for-sale. `PLAN_META`/UI/
  checkout/webhook/tests were aligned to it. Remaining: compare the masked
  Vercel Production PRO ID values to the catalog with the §4/§19 probe.
- **Polar webhook delivery**: endpoint URL, secret, enabled state, and required
  event coverage are verified; a real Polar-originated delivery and redelivery
  remain to be observed.
- **Canonical build/CI**: candidate `9d6bd66` is committed and clean on `main`;
  run production verification/build only after all env and DB gates pass.
