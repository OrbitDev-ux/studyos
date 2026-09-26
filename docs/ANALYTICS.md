# Product Analytics — StudyOS

The product-analytics **event SLA**: the small, typed set of facts StudyOS
emits, where they're fired, and how to add one. Code lives in
`src/features/analytics/`.

## Contract

- **Single source of truth**: `src/features/analytics/events.ts` declares an
  `AnalyticsEvent` discriminated union (name + props). TypeScript rejects a
  bad event name or prop shape at the call site — a typo'd/deprecated event is
  a compile error, never a silent no-op.
- **Two sinks, same union**:
  - server → `capture(event)` in `capture.ts`. Dev builds log a structured
    line; production is a deliberate no-op until a server sink is wired (Vercel
    Web Analytics is client-only). Transport seam documented in that file.
  - client → `trackEvent(event)` in `client.ts`, firing the Vercel Web
    Analytics beacon already mounted in the root layout.
- **Never break the caller**: both sinks swallow their own errors and make no
  network/DB calls, so they're safe inside billing transactions, cron jobs,
  and UI effects.
- **No PII / no free text**: props are cheap, already-computed values (plan,
  count, subject name) — never user content.

## Events (current SLA)

| Event | Fired where | Props |
| --- | --- | --- |
| `signup_completed` | `features/auth/actions.ts` — `signUpWithEmail` (email), `signInAsGuest` (guest), after the user row commits | `method: "email" \| "guest"` |
| `login_completed` | `lib/auth.ts` NextAuth `events.signIn` (all providers) | `method: "credentials" \| "google" \| "unknown"` |
| `problems_generated` | `features/problems/actions.ts` — `generateProblems`, after the ProblemSet transaction commits | `count, subject, type` |
| `demo_started` | `features/analytics/components/demo-start-tracker.tsx` in the demo layout, once per tab session | — |
| `charge_succeeded` | `features/billing/payment-service.ts` grant branch — every successful charge (Toss checkout/renewal, Polar `order.paid`) | `plan, amount, currency, provider` |
| `subscription_canceled` | `features/billing/checkout-actions.ts` — `cancelSubscription` after the flag is set | `plan, atPeriodEnd` |
| `subscription_expired` | `features/billing/renewal.ts` — cancel-at-period-end branch and grace-expiry branch | `plan, reason: "grace" \| "cancel"` |
| `checkout_started` | `features/billing/checkout-actions.ts` — `startCheckout`, only after the checkout session was actually created | `plan, provider: "polar" \| "toss"` |
| `pricing_viewed` | `features/analytics/components/pricing-view-tracker.tsx` on the /pricing page (client) | — |

`charge_succeeded` intentionally does **not** distinguish a first purchase from
a renewal — that classification belongs to whatever sink consumes the event
(from the `provider`/`amount` stream), keeping the emission honest and cheap.

## Funnel

The spend-side funnel is the sequence `pricing_viewed → signup_completed →
checkout_started → charge_succeeded` (checkout_started is the topside baseline:
`conversion = charge_succeeded / checkout_started`). Attribution caveats to keep
honest when reading the numbers:

- `pricing_viewed` is client-only today (Vercel beacon); the rest are server
  events that currently dev-log only until a server sink is wired (next
  section). A funnel computed across the two different sinks is apples-to-
  oranges — compute it only after `capture()` has a persistent sink.
- `checkout_started` fires only after the provider session was actually created
  (no credit for failed kickoffs), so conversion denominators aren't inflated.
- The authoritative revenue/retention truth is the DB-backed
  `/admin/revenue` page (`features/billing/metrics.ts`); analytics touch the
  funnel shape, not the ledger.

## Adding an event

1. Add a member to the `AnalyticsEvent` union **and** a line to
   `EVENT_DESCRIPTIONS` in `events.ts` (typed lockstep — both must change).
2. Fire it with `capture(...)` (server) or `trackEvent(...)` (client) at the
   success path, after the state change commits, outside any error path that
   can swallow it.
3. Add it to the sample list in `capture.test.ts` so the smoke test covers it.
4. Run `npm run typecheck && npm run lint && npm run test`.

## Wiring a real server sink

Server events don't reach Vercel Web Analytics (client-only). To persist them,
route a provider through `capture()`'s transport seam — no call site changes
needed, since every event is already the `AnalyticsEvent` union. Until then,
cohort analysis is possible from client-beacon events + the existing
`AuditLog` billing/account rows, but server product events are dev-visible
only.

Design stance (Phase 8): **no vendor lock, no PII**. Whatever provider lands in
`capture()` must accept the existing typed events as-is (names + primitive
props), must be server-safe inside transactions (fire-and-forget, own failure
swallowing), and must not receive free-text/user content — the union guarantees
all of these today. Prefer a provider that is: hosted/EU-safe for Korean
student PII-adjacent data, cheap at this scale, and HTTP-first. Re-evaluate the
moment cohort/funnel analysis is actually needed, not before.

## Verification

`src/features/analytics/capture.test.ts` asserts every catalog event fires
without throwing (dev line emitted) and that the sink swallows its own
failures. `<sink>` errors must never surface to users; the smoke test protects
that contract.
