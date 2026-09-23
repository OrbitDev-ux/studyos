# StudyOS — Handoff Notes

State of the project for anyone (human or agent) picking up next. Read
`README.md` and `DEVELOPMENT.md`-style notes in `docs/` for depth; this is the
short version.

## Stack

Next.js App Router · React · TypeScript · Prisma/PostgreSQL (Supabase) ·
NextAuth (credentials + Google) · Vitest · ESLint/Prettier · NextUI-style
Tailwind UI. Payments: Polar (primary) + Toss (legacy). Analytics: Vercel
Web Analytics + Sentry + Google AdSense (TRIAL-only). i18n: hand-rolled
`src/features/i18n` (marketing pages stay static Korean).

## Local verification (2026-09-23)

- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 errors; 2 pre-existing warnings (`scripts/verify-ban.mjs:32`,
  `src/features/dev/components/file-explorer.tsx:69`).
- `npm run test` — 124 files / 891 tests pass.
- `npx prisma generate` and `npm run typecheck` — pass.
- `npx next build` — pass as a compile-only build on the localhost scratch
  environment; this is not a production build.

## Latest production closure update — 2026-09-23

The Production alias and pricing/auth/admin public smoke checks pass. Supabase
Management SQL now confirms all 47 local migrations/checksums are applied with
zero pending, the expected RLS/grants/index/reward columns, zero refund
duplicates, and zero User/Payment/Refund/Subscription rows. A 161,797-byte
mode-600 dump was restored into an isolated local PostgreSQL 16 drill. Managed
backup/PITR are still absent. Polar's production StudyOS PRO is active at
$9.99 USD/month and its enabled webhook endpoint/secret/event coverage match
the live route; Polar ID mapping and real provider delivery are not verified.
Vercel hides sensitive DB and Polar ID values from the local CLI, and
`GROQ_API_KEY` is absent. Google OAuth is now safe-disabled unless both
credentials exist; current login/signup exposes email and guest flows only.
The source checkpoint is committed locally as `3ccf283`, but is not yet in the
Production deployment. Full local
verification is now 124 files / 891 tests, typecheck/lint and compile-only
build PASS. See
`docs/P0_CLOSURE.md` before any deployment.

## Previous implementation work

1. **Closed the anon-REST trust boundary (Phase C2)** — every client that
   talked to Supabase REST with the anon key now uses Prisma:
   - Migrated 12 files: `problems/actions.ts`, `battle/actions.ts`,
     `battle/queries.ts`, `ranking/actions.ts`, `ranking/queries.ts`,
     `social/actions.ts` (+ full test rewrites for battle/ranking/social).
   - Deleted `src/lib/supabase/server.ts`, `client.ts`, `middleware.ts`.
     Only `src/lib/supabase/admin.ts` remains (service-role Storage).
   - Migration `20260921000000_close_anon_rest_trust_boundary` revokes all
     public/anon/authenticated grants on public tables+sequences, enables RLS
     on 12 user-data tables, and carves out ONE anon SELECT policy on the
     `Maintenance` singleton row (maintenance gate in
     `auth.config.ts` `authorized()` still reads it via
     `src/lib/maintenance-edge.ts` — NOT dead code; `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     is still required for that edge read).
2. **Polar billing as primary provider (Phases D–E)** — provider-neutral
   records, Polar-first checkout, fail-closed webhook trust model:
   `src/features/billing/{polar-client,providers,polar-events}.ts`,
   `src/app/api/webhooks/polar/route.ts`, `startCheckout` +
   provider-aware cancel/resume in `checkout-actions.ts`, Polar branch in
   `src/app/billing/callback/route.ts`, `renewal.ts` + `payment-service.ts`
   narrowed to Toss-owned subs only, pricing gate via `isCheckoutUsable()`,
   `.env.example` Polar block, 8 new tests. See `docs/BILLING_POLAR.md`.
3. **Marketing/SEO hardening (Phase F first slice)** — `viewport` +
   theme-color in root layout; canonical/OG/twitter metadata on `/pricing` and
   `/contact`; `docs/MARKETING.md`.
4. **Product analytics event SLA (Phase G)** — typed event union in
   `src/features/analytics/events.ts`, server `capture()` + client
   `trackEvent()` (Vercel beacon) sinks that never throw, events wired at
   their real success paths, smoke tests, `docs/ANALYTICS.md`.
5. **Revenue Readiness (Phase I)** —
   - Billing hardening: `applyRefundEvent(revokeEntitlement)` so POLAR
     **partial** refunds record money without pulling access (full refunds
     still revert to TRIAL); `subscription.revoked` resolves the user from
     `metadata.userId` **and** falls back to our own `subscription` row by
     `externalId`, and still closes the row when ownership can't be
     determined (`polar-events.ts`).
   - Funnel: `checkout_started` (fired only after a session is created) +
     `pricing_viewed` (client) added to the SLA catalog; funnel notes in
     `docs/ANALYTICS.md`.
   - Revenue foundation: read-only `features/billing/metrics.ts` + admin
     `/admin/revenue` page (SUPER_ADMIN `manageSystem`) — DB-derived numbers;
     Polar dashboard stays the money ledger.
   - Security tests: callback ownership mismatch, unauthenticated
     `startCheckout`, partial-refund/revoked-fallback coverage.
   - Sandbox harness `scripts/polar-sandbox-smoke.mjs`; env contract table in
     `docs/BILLING_POLAR.md`; `docs/PRODUCTION_CHECKLIST.md` (go-live + rollback
     - final gate).
6. **Final Pre-Deployment Gate (Phase J)** — deployment-candidate freeze:
   - Regression audit → one real gap fixed: Toss `PARTIAL_CANCELED` now passes
     `revokeEntitlement: false` to `applyRefundEvent` (parity with the Polar
     partial-refund fix); verified no other regression surfaced.
   - Revenue metrics semantics documented in `metrics.ts` + `/admin/revenue`
     ("순수입" net label, KRW/UTC/idempotency assumptions, MRR deliberately
     deferred with its formula).
   - `scripts/production-preflight.mjs` — READ-ONLY env existence validator
     (never prints values; exit 0/1/2 = ready / core missing / billing
     partial-under-`--require-billing`).
   - `npm run verify:production` — typecheck → lint → tests → preflight →
     compile-only `next build`. NEVER runs migrations/billing mutations.

- `docs/PRODUCTION_CHECKLIST.md` → ordered DB deploy safety (backup/recovery
  → DATABASE_URL confirm → history → pending → destructive-SQL review →
  deploy → smoke), failure/rollback runbook (6 scenarios), P0/P1/P2
  classification. `docs/BILLING_POLAR.md` → Polar sandbox runbook.

7. **Study-session reward eligibility (anti-cheat, Phase K)** — split
   wall-clock from server-verified time so the timer can't be farmed for
   rewarded/competitive surfaces:
   - Migration `20260923000000_study_session_reward_eligibility` adds
     `StudySession.rewardEligibleDurationSec` (default 0) + `lastVerifiedAt`,
     and backfills closed sessions as fully eligible so existing streaks/
     rankings/battle time aren't zeroed.
   - `src/features/study-sessions/eligibility.ts` — pure policy
     `finalizeEligibleDuration` (credit only spans within
     `MAX_VERIFIED_GAP_SEC = 600` of a presence checkpoint) +
     `stampActiveSessionCheckpoint`, wired into the existing app-wide heartbeat
     (`touchPresence`) — the ONLY writer, never client input.
   - `stopStudySession` now passes ONLY the reward-eligible seconds to the
     Growth hook (XP/missions), and the competitive surfaces read
     `rewardEligibleDurationSec`: streak (`queries.ts`), ranking
     (`ranking/queries.ts`), battle study_time (`battle/queries.ts`), friend
     feed (`social/activity.ts`). Personal surfaces (dashboard/stats/analytics/
     AI-context/planner) keep raw `durationSec` — self-tracking is never
     penalized.
   - Tests: new `eligibility.test.ts`, updated `actions.test.ts` (verified vs
     unattended cases, race-loss and no-session guards).

## Known pending / blocked

- **Production deployment closure (current phase)**: latest read-only recheck
  confirms `main` is clean at launch candidate `9d6bd66` and linked Vercel
  project `yesungvibecodes-3119/studyos`. Production env names omit required
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `GROQ_API_KEY`; sensitive values
  cannot be validated via local Vercel pull/run. The configured
  `NEXT_PUBLIC_SITE_URL` is `https://studyos-teal-eta.vercel.app`; its public
  StudyOS routes return 200. The production-scoped Polar token read the catalog
  successfully. The single existing endpoint was corrected to this origin's
  `/api/webhooks/polar`, with matching secret and required events; unsigned and
  signed no-op probes returned 401/200. Real Polar-originated delivery and the
  Vercel PRO ID mapping remain NOT VERIFIED.
  - Production Supabase project ref matches the configured Supabase URL, but
    sensitive DB connection values are masked. Supabase backup listing reports
    no physical backups and PITR disabled (**backup gate FAIL**). Migration
    history, duplicate-refund probe, RLS and restore remain NOT VERIFIED. No DB
    mutation or deployment was performed.
  - Latest local regression: Prisma generate, typecheck, lint (2 warnings),
    and 123 files / 889 tests PASS.
  - **Production Polar pricing RESOLVED ($9.99 launch decision)**: org's ONE
    product "StudyOS PRO" @ $9.99 USD/month IS the catalog. `PLAN_META`/UI/
    checkout/webhook/analytics aligned to PRO = 999 USD / month; PREMIUM is
    not-for-sale (`notForSale`), its checkout fails closed. Only the PRO
    price/product ids are required in the prod env; PREMIUM pair optional.
  - Next: resolve missing env names, establish a restorable backup, validate
    sensitive values in the actual target, inspect the DB and refund probe, then
    verify the masked Polar PRO ID mapping and capture a real Polar-originated
    webhook delivery. Follow `docs/P0_CLOSURE.md`; do not deploy until all P0
    gates pass.
- **Polar sandbox E2E (current phase)**: local DB recovered via an isolated
  Homebrew Postgres cluster on `:5433` (Docker/Supabase CLI not runnable on this
  Mac — colima VZ/QEMU OOM, no Docker Desktop; the pre-existing Postgres cluster
  was left untouched). All migrations applied (local-only). Credentials
  signup → session works; `/pricing` → PRO opens a real sandbox checkout
  (verified $9.99 USD). Fixed + sandbox-verified a Polar checkout API change
  (`products: [productId]`), added per-plan product-id config; tests at
  878/878. **Session update (880/880, tsc/lint clean)**: the sandbox credential set is now
  present in `.env.local`, the `polar` CLI is installed and logged in to sandbox,
  and a fresh live checkout creation PASSed (`polar-sandbox-smoke.mjs
  --skip-browser`). Still blocked on: (1) recreating the local `:5433` scratch DB
  (its data dir no longer exists), (2) `polar listen …/api/webhooks/polar` +
  the interactive test-card payment.
  **Later session update (invoice):** the whole sandbox workflow was completed —
  `:5433` scratch cluster rebuilt (47/47 migrations, `migrate status` up to date,
  RLS/grants/columns/index verified), dev server on `:4000` with the CLI session
  webhook secret, `polar listen` connected. The user completed a real sandbox
  card payment → Polar recorded `order.paid` / `subscription.created`
  (`b8f4dcc7-a03b-4e48-8740-526ca661cdcf`, $9.99 USD, metadata userId/plan).
  `checkout.created` relayed live (200 OK). The CLI tunnel relays ONLY
  `checkout.*` (order/subscription events were never ambiently delivered), so the
  authentic event records were delivered to `/api/webhooks/polar` with a valid
  signature (session secret) — **verified**: Payment SUCCEEDED usd/999 +
  Subscription PRO/ACTIVE + `User` plan=PRO/subscriptionStatus=ACTIVE; redelivery
  3× → 1 Payment (idempotent); full refund → Refund row + Subscription CANCELED +
  `User` TRIAL (revert). Currency isolation: `byCurrency` `{usd: 1, 999}`, KRW
  total stays 0. **NOT live-verified** (tunnel doesn't relay; unit-tested only):
  cancel-at-period-end, partial refund (no-revoke), `subscription.revoked` —
  deliver these via a registered production webhook.
- **Apply the migrations**: `prisma migrate deploy` at deploy time (no local
  DB/.env in this workspace). Three pending, in order:
  `20260921000000_close_anon_rest_trust_boundary`,
  `20260922000000_refund_external_refund_id_unique`, and
  `20260923000000_study_session_reward_eligibility`.
- **Polar go-live**: no credentials exist. Everything is env-configured
  fail-closed (unconfigured → pricing CTA disabled, webhook 500/401). Must
  sandbox-smoke-test before first production charge: run
  `node --env-file=.env.local scripts/polar-sandbox-smoke.mjs`, then walk
  `docs/PRODUCTION_CHECKLIST.md` (sections 2–10).
- `next build` cannot run locally (no env). `.next/types` is not committed —
  run `npx next typegen` after a fresh checkout before typechecking.
- **Server analytics sink**: `capture()` is a dev-log/no-op on the server
  (Vercel Web Analytics is client-only) until a provider is routed through its
  transport seam — see `docs/ANALYTICS.md`.
- **Unbuilt (Phase F remainder), needs a decision**: PLG
  (referral/invite-link/waitlist/welcome email — email infra is a no-op
  chokepoint).

## Sensitivities (read before editing)

- **Billing/entitlement**: never grant entitlement from an unverifiable event;
  never let a superseded subscription rip away a newer plan; keep the two
  providers from double-charging (`paymentProvider` filters are load-bearing).
- **Edge middleware**: `getMaintenanceEdge()` must keep working against a
  public Maintenance row with the anon key — do not revoke that carve-out.
- **Marketing copy honesty**: only promise live features (pricing PLAN_PITCH
  rule); bump `CONTENT_UPDATED_AT` on real content changes.
- Tests are part of implementation; full suite must pass before declaring a
  phase done.
