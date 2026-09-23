# Next Agent Upgrade — StudyOS

Handoff for the next agent session. Read `docs/HANDOFF.md` (state),
`docs/IMPLEMENTATION_TRACKER.md` (phases), `AGENTS.md` (rules). This file is
the "what to do next".

## Context you're inheriting

The security (A–C2), billing (D–E), marketing/SEO (F first slice), analytics
(G), project docs (H), Revenue Readiness Phase I, Final Pre-Deployment Gate (J),
and study-session reward-eligibility anti-cheat (K) work is **done and fully
verified** (124 test files / 891 tests, typecheck clean, lint 0 errors).
Phase K (new this session): `StudySession.rewardEligibleDurationSec` +
`lastVerifiedAt` (migration 20260923000000 + backfill), reward-eligibility
policy+checkpoint in `eligibility.ts` wired into the existing `touchPresence`
heartbeat, `stopStudySession` rewarding only verified time, and streak/ranking/
battle-studytime/friend-feed switched to the verified field (personal
dashboard/stats/analytics keep raw `durationSec`). Phase I code is complete
modulo credentials: sandbox harness, billing hardening, funnel events, revenue
metrics (+`/admin/revenue`), security tests, and the go-live checklist
`docs/PRODUCTION_CHECKLIST.md`.

## The immediate follow-up (deploy-level — production gates remain blocked)

The **sandbox billing lifecycle is verified** (see `docs/P0_CLOSURE.md`). The
latest Production SQL audit verifies all 47 migration names/checksums, zero
pending, refund duplicate probe 0, expected RLS/index/columns, and zero user or
financial rows. A private dump and isolated restore drill pass, though managed
backup/PITR are off. Production Polar catalog and existing webhook config pass;
masked Vercel PRO IDs and DB URL mapping remain unverified. The login pages use
Credentials/Guest; code now omits Google unless both credentials exist.
`GROQ_API_KEY` is missing, so AI remains launch-critical and production
preflight cannot pass. Latest READY deployment is still `9d6bd66`; source
checkpoint `3ccf283` is committed locally but not deployed. Do not deploy until the remaining P0 gates
are cleared:

0. **Production Polar pricing RESOLVED ($9.99 launch decision)**: the
   production Polar org's product "StudyOS PRO" @ **$9.99 USD / month** is now
   the canonical catalog price. `PLAN_META`/UI/checkout/webhook/analytics were
   aligned to **PRO = 999 USD / month**; PREMIUM is `notForSale` (its checkout
   fails closed). Only `POLAR_PRO_PRICE_ID`+`POLAR_PRO_PRODUCT_ID` are required
   (PREMIUM pair optional/empty) — verify against the dashboard with the §4/§19
   read-only probe before the first live checkout.
1. Set `GROQ_API_KEY` in Vercel Production. In Vercel/Supabase dashboards,
   privately verify `DATABASE_URL`/`DIRECT_URL` target ref
   `okhgmyuixobxiczkinej` and verify `POLAR_PRO_PRODUCT_ID`/`POLAR_PRO_PRICE_ID`
   match the active $9.99 USD monthly StudyOS PRO objects; do not share values.
2. Run canonical production verification from a context with the real runtime
   variables, then perform a read-only Prisma DB health check. Do not rerun
   migrations: all three expected migrations are already applied and there are
   zero pending.
3. No production provider-originated event exists yet. A real
   `checkout.created` delivery can be verified when the single non-payment
   launch checkout session is created after every other gate passes. Later
   verify cancel-at-period-end, partial refund, revocation and redelivery.
4. Commit the reviewed local fix/evidence, then deploy only after all P0 gates
   pass. No production deploy/checkout has been done by this recheck.

## The open decision (ask the user before building)

Phase F's PLG scope. Facts from inventory: there is **no** referral /
invite-link / waitlist / welcome-email surface today. The pieces that exist:
trial+billing (active), onboarding tour, gamification (XP/missions/streak),
social friend-requests + battle invites (in-product, not PLG), a **no-op**
`sendEmail()` chokepoint (`src/lib/email.ts`), and milestone banner. Building a
referral system implies Prisma schema changes + new actions + UI — a
multi-session feature. Propose a concrete bounded slice and get sign-off
before writing code. Options, in ascending scope:

Analytics is already delivered (`docs/ANALYTICS.md`); what remains:

1. **Welcome email** — send an email on signup through `sendEmail()`
   (provider unconfigured; would need a send provider decision first).
2. **Invite-link share** — shareable `?ref=` links + a `referredBy` column
   (schema change; no payout, just attribution + a thanks banner).
3. **Server analytics sink** — route `capture()` to a real server-side
   provider through its transport seam (currently dev-log/no-op server-side).
4. All of the above, phased.

## If you get sign-off (patterns to follow)

- New feature code → `src/features/<x>/` with `actions.ts` / `queries.ts` /
  `components/`, Prisma access via `@/lib/prisma` (no Supabase REST), server
  auth via `requireCurrentUser`/`getCurrentUserOrNull`.
- Marketing copy → hardcoded Korean in `src/config/*.ts` or the page; bump
  `CONTENT_UPDATED_AT`; keep pages statically renderable.
- Analytics events → extend the `AnalyticsEvent` union + `EVENT_DESCRIPTIONS`
  in `src/features/analytics/events.ts` (typed lockstep), fire with
  `capture()`/`trackEvent()` at the success path, add to the sample list in
  `capture.test.ts`.
- Schema change → inspect `prisma/schema.prisma` + latest migration, keep
  backward compatible, generate + verify the migration, and note that the
  C2 migration's REVOKE/RLS means any new public-readable table needs its own
  explicit (preferably no) grant.
- Test with Vitest alongside → run the narrowest set first, then
  `npm run typecheck && npm run lint && npm run test`.

## Always-on checks for this repo

- After a fresh checkout: `npx next typegen` (`.next/types` isn't committed).
- `next build` and `prisma migrate deploy` need env/DB — don't claim them.
- Edge gate `getMaintenanceEdge()` (auth.config.ts) still needs the anon key +
  the Maintenance SELECT carve-out; don't "clean up" either.

## Definition of done for the next session

- **Unblock the deploy gate with real credentials** (this is the whole point of
  the freeze): resolve the production Polar pricing decision (KRW products or an
  explicit pricing decision), set env, run
  `node --env-file=.env.production scripts/production-preflight.mjs --require-billing`
  until exit 0, then `npm run verify:production` to green in CI.
- Then the ORDERED runbooks — do not skip: database deploy-safety checklist
  (`docs/PRODUCTION_CHECKLIST.md` §1 backup→migrate:status→deploy→smoke),
  Polar sandbox runbook (`docs/BILLING_POLAR.md`),
  Polar webhook registration, sandbox→prod env swap, rollback rehearsal.
- Any authorized follow-up delivered + verified (typecheck + lint + test
  recorded), `NEXT_AGENT_UPGRADE.md` updated to the _following_ session's work,
  tracker rows for completed items flipped, and a green suite recorded last.
