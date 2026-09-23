# Next Agent Upgrade — StudyOS

Handoff for the next agent session. Read `docs/HANDOFF.md` (state),
`docs/IMPLEMENTATION_TRACKER.md` (phases), `AGENTS.md` (rules). This file is
the "what to do next".

## Context you're inheriting

The security (A–C2), billing (D–E), marketing/SEO (F first slice), analytics
(G), project docs (H), Revenue Readiness Phase I, Final Pre-Deployment Gate (J),
and study-session reward-eligibility anti-cheat (K) work is **done and fully
verified** (122 test files / 880 tests, typecheck clean, lint 0 errors).
Phase K (new this session): `StudySession.rewardEligibleDurationSec` +
`lastVerifiedAt` (migration 20260923000000 + backfill), reward-eligibility
policy+checkpoint in `eligibility.ts` wired into the existing `touchPresence`
heartbeat, `stopStudySession` rewarding only verified time, and streak/ranking/
battle-studytime/friend-feed switched to the verified field (personal
dashboard/stats/analytics keep raw `durationSec`). Phase I code is complete
modulo credentials: sandbox harness, billing hardening, funnel events, revenue
metrics (+`/admin/revenue`), security tests, and the go-live checklist
`docs/PRODUCTION_CHECKLIST.md`.

## The immediate follow-up (deploy-level — needs production credentials)

The **sandbox billing lifecycle is now verified** (see `docs/P0_CLOSURE.md` and
`docs/HANDOFF.md`): a real sandbox USD card payment ran through
`order.paid`/`subscription.created` → Payment/Subscription/entitlement, idempotent
redelivery, full-refund revert, and currency isolation. This session also ran a
**read-only production closure audit** with these NEW findings (must be cleared
before any checkout):

0. **Production Polar pricing RESOLVED ($9.99 launch decision)**: the
   production Polar org's product "StudyOS PRO" @ **$9.99 USD / month** is now
   the canonical catalog price. `PLAN_META`/UI/checkout/webhook/analytics were
   aligned to **PRO = 999 USD / month**; PREMIUM is `notForSale` (its checkout
   fails closed). Only `POLAR_PRO_PRICE_ID`+`POLAR_PRO_PRODUCT_ID` are required
   (PREMIUM pair optional/empty) — verify against the dashboard with the §4/§19
   read-only probe before the first live checkout.
1. Obtain **production** DB/`POLAR_*` credentials. Then:
   - `node --env-file=.env.production scripts/production-preflight.mjs --require-billing`
     (currently **exit 1**: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
     `AUTH_URL`, Google, Supabase, ADMIN, GROQ, and 4 billing ids all MISSING —
     only `POLAR_TOKEN`/`POLAR_WEBHOOK_SECRET` are present and correct/prod-scoped).
   - walk `docs/PRODUCTION_CHECKLIST.md` sections 2–10 (DB backup →
     migration → webhook registration → funnel check → rollback rehearsal).
   - deploy applies THREE pending migrations: `...trust_boundary`,
     `...refund_external_refund_id_unique`, `...study_session_reward_eligibility`.
2. Register `https://<prod-domain>/api/webhooks/polar` with the **production**
   secret (never the `polar listen` session secret) and re-walk the live
   lifecycle: `order.paid`, cancel-at-period-end, partial refund (no-revoke),
   `subscription.revoked` (with/without `metadata.userId`), duplicate redelivery.
3. Commit the phase A–K working tree (uncommitted on `main`, incl. the 3
   canonical migrations); confirm `next build` + `prisma migrate deploy` in CI.

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
