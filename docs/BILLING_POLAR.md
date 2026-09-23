# Polar Billing Integration

StudyOS uses **Polar** as its primary recurring-billing provider. **Toss**
remains supported as a legacy provider for existing subscribers only. This doc
describes the Polar side; the provider-neutral payment/entitlement records live
in `features/billing/payment-service.ts` and both are read by
`providers.ts` (`activeBillingProvider`, `isBillingConfigured`,
`isCheckoutUsable`).

## Provider selection (fail-closed)

- If `POLAR_TOKEN`, `POLAR_PRO_PRICE_ID`, and `POLAR_PRO_PRODUCT_ID` are set →
  new checkouts use Polar (`activeBillingProvider() === "polar"`). PREMIUM is
  not-for-sale and its IDs are optional.
- Otherwise Toss legacy is used if `TOSS_SECRET_KEY` + `NEXT_PUBLIC_TOSS_CLIENT_KEY`
  are set.
- If neither is configured, `isCheckoutUsable()` is false and the pricing CTA is
  disabled — never a live-looking button that cannot actually charge.

## What Polar does vs. what StudyOS does

| Concern                                                    | Owner                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Hosted checkout, card capture, PCI                         | Polar (`POST /v1/checkouts/`)                          |
| Recurring charges, dunning, retention                      | Polar (no renewal cron needed)                         |
| Entitlement grant                                          | StudyOS, **only** from the signed `order.paid` webhook |
| Entitlement revoke                                         | StudyOS, only from `subscription.revoked`              |
| Billing-record bookkeeping (`subscription`/`payment` rows) | StudyOS, idempotent                                    |

The `GET /billing/callback?checkout_id=...` redirect only decides the banner;
it grants nothing (that is the `order.paid` webhook's job).

## Webhook trust model

Register `https://<domain>/api/webhooks/polar` in the Polar organization and
enable: `checkout.created/updated`, `order.paid/refunded`,
`subscription.created/active/updated/canceled/past_due/uncanceled/revoked`.

`POST /api/webhooks/polar` is fail-closed:

- Missing `POLAR_WEBHOOK_SECRET` → `500` (Polar retries up to ~3 days; a paid
  order is never silently dropped).
- Bad/missing signature → `401`, before any state is touched. Signatures are
  verified with constant-time compare; both Polar's `Polar-Signature` (hex
  HMAC-SHA256 of the raw body) and Standard-Webhooks framing are accepted.
- Redeliveries are harmless: `applyPolarWebhook` maps to
  `applyPaymentEvent`/`applyRefundEvent`, which dedupe on unique keys
  (`polar:order:<orderId>`, refund id / `polar:order:<orderId>`).

## Events → effects

- `order.paid` → `applyPaymentEvent` grants the plan (plan resolved from order
  / checkout metadata, then price id, then the subscription; user resolved from
  `customer.external_id`, then `metadata.userId`, then the subscription).
- `order.refunded` → `applyRefundEvent`; a **full** refund of the current active
  payment reverts the user to TRIAL. A `partially_refunded` order only records
  the money returned (`revokeEntitlement: false`) — the customer still paid for
  the current period, so access stays.
- `subscription.revoked` → reverts to TRIAL **only if** the revoked sub is the
  user's current active one (a superseded sub is never allowed to yank a newer
  plan). The userId is taken from webhook `metadata.userId` **falling back to
  StudyOS's own `subscription` row** by `externalId`, so a revoked event missing
  metadata still closes the loop instead of leaking entitlement. If neither can
  resolve the owner, the subscription row is still closed (CANCELED) but no
  entitlement is guessed at.
- `subscription.canceled` / `past_due` / `active` / `updated` →
  bookkeeping (`syncSubscriptionRecord`); no entitlement change. `canceled`
  with `cancel_at_period_end:true` mirrors the end-of-period cancel flag
  exactly the way `cancelSubscription` (profile page) sets it at Polar via
  `PATCH /v1/subscriptions/{id}`.

Subscription statuses map to records as: `active`/`past_due` → ACTIVE,
`canceled` → (left as-is; end-of-period), `revoked` → CANCELED. Unmapped
statuses fail closed (no entitlement change).

## Config — environment contract

All Polar variables are **server-side only**. Never prefix them with
`NEXT_PUBLIC_` — Next inlines `NEXT_PUBLIC_*` into the client bundle, which
would ship the webhook secret / token to every browser.

| Variable                   | Scope  | Required | Purpose                                                                                                                                                                                             | Dev             | Preview         | Prod         |
| -------------------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------- | ------------ |
| `POLAR_TOKEN`              | server | ✅       | Polar REST access token. CAREFUL: the same token works for DEV and PROD in Polar — keep the account it belongs to locked down.                                                                      | sandbox token   | sandbox token   | prod token   |
| `POLAR_WEBHOOK_SECRET`     | server | ✅       | HMAC secret for `/api/webhooks/polar`; empty/absent fails closed (500).                                                                                                                             | sandbox         | sandbox         | prod         |
| `POLAR_PRO_PRICE_ID`       | server | ✅       | Price id → StudyOS PRO ($9.99 USD/month); required for signed order identity mapping.                                                                                                                | sandbox price   | sandbox price   | prod price   |
| `POLAR_PREMIUM_PRICE_ID`   | server | optional | Historical mapping only; PREMIUM is not-for-sale at launch.                                                                                                                                         | unset           | unset           | unset        |
| `POLAR_PRO_PRODUCT_ID`     | server | ✅       | Product id → StudyOS PRO. The current Checkout API selects items by PRODUCT id (`products: [productId]`), so a plan needs its product id in addition to the price id used for webhook plan-mapping. | sandbox product | sandbox product | prod product |
| `POLAR_PREMIUM_PRODUCT_ID` | server | optional | Historical mapping only; PREMIUM is not-for-sale at launch.                                                                                                                                         | unset           | unset           | unset        |
| `POLAR_SANDBOX`            | server | optional | `"1"` (or truthy) switches the API base to `https://sandbox-api.polar.sh`.                                                                                                                          | `1`             | unset/`""`      | unset/`""`   |
| `POLAR_API_URL`            | server | optional | Overrides the base URL outright (useful for a fixed sandbox/proxy). Highest priority.                                                                                                               | sandbox         | as needed       | unset        |

```env
# .env.local (dev/sandbox)
POLAR_SANDBOX="1"
POLAR_TOKEN="polar_pat_..."                 # sandbox token
POLAR_WEBHOOK_SECRET="..."                  # matches the registered sandbox endpoint
POLAR_PRO_PRICE_ID="price_..."              # sandbox price id ⇒ PRO
POLAR_PREMIUM_PRICE_ID="price_..."          # sandbox price id ⇒ PREMIUM
POLAR_PRO_PRODUCT_ID="product_..."          # sandbox product id ⇒ PRO
POLAR_PREMIUM_PRODUCT_ID="product_..."      # sandbox product id ⇒ PREMIUM
```

> API shape note: `createPolarCheckoutSession` sends
> `{ products: [productId], customer_email, external_customer_id, success_url,
metadata }` — verified 201 against `sandbox-api.polar.sh` (single price per
> StudyOS product ⇒ price auto-applied). The old top-level `product_price_id`
> field is rejected by the current API (422).

Deploy-time notes:

- The same source repo deploys Dev/Preview/Prod; only the env values differ. Do
  **not** copy the prod webhook secret or prod price ids into dev/.env.local.
- Changing `POLAR_TOKEN`/secret requires rotation in Polar's dashboard at the
  same time, or the webhook endpoint starts 401'ing (fail-closed, safe).
- `SITE_URL` (used for the checkout `success_url`) must be the real public origin
  per environment — in dev use `http://localhost:3000`.

## File map

- `features/billing/polar-client.ts` — REST client, price/plan mapping,
  signature verification.
- `features/billing/polar-events.ts` — signed-event → billing record mapping.
- `features/billing/providers.ts` — provider selection + `isCheckoutUsable`.
- `features/billing/checkout-actions.ts` — `startCheckout` (Polar-first),
  provider-aware cancel/resume.
- `features/billing/components/upgrade-checkout-button.tsx` — redirects to
  Polar checkout (Toss widget for legacy).
- `app/api/webhooks/polar/route.ts` — fail-closed webhook endpoint.
- `app/billing/callback/route.ts` — browser-return banner logic (no grants).

## Polar sandbox runbook (first-timer, in order)

Goal: prove the real Polar flow against **sandbox** before any production
charge. Nothing here touches money or production.

**Required env (names only — values go in a git-ignored `.env.local`):**

| Variable                 | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `POLAR_SANDBOX=1`        | force the sandbox API base (mandatory guard)  |
| `POLAR_TOKEN`            | **sandbox-scoped** access token               |
| `POLAR_PRO_PRICE_ID`     | sandbox price id that maps to StudyOS PRO     |
| `POLAR_PREMIUM_PRICE_ID` | sandbox price id that maps to StudyOS PREMIUM |
| `POLAR_WEBHOOK_SECRET`   | sandbox webhook endpoint secret               |
| `AUTH_URL`               | local success-URL origin                      |

0. **Environment check (read-only, done FIRST)** — probe `GET /v1/products`
   against both `sandbox-api.polar.sh` and `api.polar.sh` with the token
   (`Authorization: Bearer`). 200 identifies which environment the token is
   scoped to; 401 the other. Never guess — if a token authenticates nowhere or
   somewhere unexpected, report BLOCKED instead of proceeding.
   - Token is **sandbox**-scoped → continue below; store it in `.env.local`
     only, never `.env.production`.
   - Token is **production**-scoped → STOP. Do not create checkouts, register
     webhooks, or run lifecycle steps. Report the production credential.
1. **Env preparation** — copy `.env.example` → `.env.local`. You only need the
   Polar block + `AUTH_URL` for this runbook:
   ```env
   POLAR_SANDBOX="1"
   POLAR_TOKEN="<sandbox token>"
   POLAR_PRO_PRICE_ID="<sandbox price id>"
   POLAR_PREMIUM_PRICE_ID="<sandbox price id>"
   POLAR_WEBHOOK_SECRET="<sandbox webhook secret>"
   AUTH_URL="http://localhost:3000"
   ```
   Before filling the two price ids, verify them against the sandbox product
   list (read-only) — amounts must match `PLAN_META` exactly.
2. **Sandbox credentials** — in polar.sh, switch the workspace to **sandbox**;
   create an access token (`Project → Settings → Access Tokens`, sandbox
   scope), a product with two monthly prices, and enable a webhook endpoint
   `http(s)://<your-host>/api/webhooks/polar` with `order.paid` and
   `subscription.revoked` events. Keep the webhook secret.
3. **Command** — `node --env-file=.env.local scripts/polar-sandbox-smoke.mjs`.
   It refuses to run unless `POLAR_SANDBOX=1`. Run `... --help` for flags
   (`--skip-browser`, `--timeout=`). Do NOT run a checkout browser step until
   the mapping below is verified.
   3b. **Localhost webhook delivery (safe method)** — Polar webhook endpoints need a
   public HTTPS URL; for local runs use Polar's OWN CLI listener (documented at
   polar.sh/docs/integrate/webhooks/locally):
   `curl -fsSL https://polar.sh/install.sh | bash`, `polar login`, then:
   `polar listen http://localhost:3000/api/webhooks/polar`, select the sandbox
   organization, and copy the **session secret it prints** into
   `POLAR_WEBHOOK_SECRET` (it is NOT a dashboard endpoint secret — never assume
   it equals a stored value). Do NOT create a temporary production webhook or an
   arbitrary ngrok bypass to receive events locally.
4. **Expected checkout** — the harness prints a hosted sandbox checkout URL.
   Open it, pay with the sandbox test card (card number + random CVV/date shown
   in the sandbox UI). `--skip-browser` skips polling and just prints the URL.
5. **Expected webhook** — the harness polls the checkout to a terminal state
   (`confirmed`/`succeeded`). Separately, the app should log the signed
   `order.paid` arriving at `/api/webhooks/polar`; StudyOS then records a
   SUCCEEDED Payment + ACTIVE PRO Subscription (granted entitlement).
6. **DB verification** — confirm in the DB (or `/admin/revenue`) that one
   SUCCEEDED Payment appears whose `amount`/`currency` equal the sandbox
   product's price in its OWN currency ($9.99 → `amount: 999, currency: USD`,
   NEVER converted to KRW), one ACTIVE `plan: PRO` Subscription, and
   `newPayingUsersThisMonth == 1` appear. A duplicate webhook redelivery must
   not add a second Payment (idempotency key).
7. **Entitlement verification** — as the sandbox user, PRO-gated features are
   available and the pricing page no longer shows a PRO CTA for them.
8. **Cancellation / refund verification** —
   - Profile → cancel at period end → `cancel_at_period_end` mirrors to Polar;
     entitlement stays until the period boundary.
   - In the Polar dashboard, **revoke** the subscription → `subscription.revoked`
     reverts the user to TRIAL (works even if the payload lacks
     `metadata.userId`).
   - Issue a **partial** refund on another order → refund recorded, access
     retained; a **full** refund reverts to TRIAL.
9. **Closure** — delete the sandbox user/subscription in the Polar dashboard.

### Price / plan mapping gate (both environments)

`PLAN_META` (source: `src/features/billing/plans.ts`) defines the canonical
catalog: **PRO = $9.99 USD / month** (Polar recurring price, minor units `999`
USD). **PREMIUM is NOT for sale at launch** (`notForSale: true`) — its checkout
fails closed in production no matter what ids are set. The `POLAR_PRO_PRICE_ID`
configured in any environment MUST map to a product whose price matches PRO
exactly (amount 999 USD, interval monthly, not archived), or the provider stays
OFF. PREMIUM ids are optional; leaving them empty is the correct launch config.

| StudyOS plan | Price id (env)            | Product | Currency | Amount | Interval | Verdict                                      |
| ------------ | ------------------------- | ------- | -------- | ------ | -------- | -------------------------------------------- |
| PRO          | `<POLAR_PRO_PRICE_ID>`    | —       | —        | —      | monthly  | must equal 999 USD ($9.99), not archived     |
| PREMIUM      | `<POLAR_PREMIUM_PRICE_ID>`| —       | optional | —      | monthly  | not-for-sale — may be empty (no launch gate) |

### Sandbox single-plan runbook (sandbox workspace has ONE real price)

Extra-early sandbox workspaces often have a single product price (e.g. one
PRO @ $9.99 USD) and no PREMIUM price yet. To exercise the real checkout +
webhook flow on that workspace WITHOUT faking a PREMIUM price id or reusing one
id for both plans, use the dev-only single-plan path:

- `POLAR_SANDBOX=1` — REQUIRED; the whole path is dead outside the sandbox.
- `POLAR_DEV_SINGLE_PLAN="pro"` (or `"premium"`) — the only plan that may open.
- `POLAR_TEST_PRICE_ID="<the one real sandbox price id>"` — the webhook plan-mapping source.
- `POLAR_TEST_PRODUCT_ID="<the one real sandbox product id>"` — the checkout session source.

Behavior (unit-tested): `order.paid` resolves to the chosen plan via
`POLAR_TEST_PRICE_ID`; `startCheckout` opens the checkout via
`POLAR_TEST_PRODUCT_ID`; the other plan throws `PolarNotConfiguredError` so that
checkout fails closed instead of charging the wrong plan. **Fault-closed in
production:** with `POLAR_SANDBOX` unset the dev flags are ignored and the
PRO-gate still applies (`POLAR_TOKEN` + `POLAR_PRO_PRICE_ID` +
`POLAR_PRO_PRODUCT_ID` required; PREMIUM ids optional).
`scripts/production-preflight.mjs` warns if `POLAR_DEV_SINGLE_PLAN` is
present in a target env. Never run this mode with the number of plans fixed —
its whole point is that the PRO product/price mapping gets verified in sandbox
before go-live.

> **RESOLVED (2026, $9.99 launch decision):** the production Polar workspace
> has ONE product, **StudyOS PRO @ $9.99 USD / month (fixed, recurring)** — this
> IS the official launch product, matching the canonical catalog (PRO = 999
> USD, monthly). There is no PREMIUM product and none is required (not-for-sale).
> Any PRICE below is verified in minor units of the product's OWN currency and
> never converted.

### Latest production API observation — 2026-09-23

The credential in the git-ignored `.env.production` authenticated to
`api.polar.sh` (sandbox host rejected it). A read-only catalog request found an
active `StudyOS PRO` product at 999 USD cents/month, matching the launch plan.
The Vercel Production env list contains both PRO ID variable names, but its
sensitive values could not be read locally, so their exact mapping is NOT
VERIFIED. The existing Polar webhook endpoint was corrected to the configured
Production route without creating a duplicate; its signing secret matches the
local Production secret and required events are enabled. The deployed route
returned 401 for unsigned input and 200 for a signed synthetic no-op. A real
Polar-originated event delivery remains NOT VERIFIED. No payment or billing
record was created or changed.

## Must verify before go-live (live credentials exist only in git-ignored env)

Automation: `scripts/polar-sandbox-smoke.mjs` walks the whole happy path against
Polar's sandbox API (create checkout → hosted payment → terminal state) and
prints exactly what to look for. It refuses to run unless `POLAR_SANDBOX=1`.

> **Maintenance note (2026):** as of the P0 closure run the harness was fixed to
> (a) `import assert` (ESM), (b) use the products-based Checkout payload
> (`products:[productId]`, matching `createPolarCheckoutSession` — the old
> `product_price_id` field is now rejected with 422), and (c) use a default
> customer email on a real MX domain (Polar 422s on nonexistent domains).
> Live status + full gate matrix: `docs/P0_CLOSURE.md`.

Residual manual steps the harness cannot do for you:

1. Hit the Polar **sandbox**: `POLAR_SANDBOX=1` + sandbox token/price ids, create
   a checkout, complete a card payment (test card), and confirm the
   `order.paid` webhook grants PRO/PREMIUM once (dedupe on redelivery). Confirm
   `/admin/revenue` reports the SUCCEEDED payment.
2. Cancel a subscription at period end from the profile page; confirm
   `cancel_at_period_end` lands at Polar and the unpaid renewal does NOT extend
   entitlement.
3. Refund a portion of the current subscription in the Polar dashboard; confirm
   the refund is recorded but the user does **NOT** lose access. Then issue a
   full refund on another user and confirm they revert to TRIAL.
4. Revoke a sandbox subscription from the Polar dashboard; confirm the user
   reverts to TRIAL even if the webhook payload lacks `metadata.userId`.
5. Rotate/dev-test the webhook secret and confirm bad payloads are 401/500 with
   zero state changes.

> NOTE: sandboxed mapping (price ids ↔ plans) is tested live before the first
> production charge; endpoint request/response shapes follow Polar's published
> OpenAPI and are asserted in unit tests (`polar-client.test.ts`).
