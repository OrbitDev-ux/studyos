import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Thin REST client for the Polar billing API (https://polar.sh/docs/api-reference).
 * Server-only: every call needs POLAR_TOKEN, which must never reach the client.
 *
 * Polar is StudyOS's PRIMARY billing provider when configured (see
 * features/billing/providers.ts): recurring charges are issued by Polar itself
 * and reported to us over signed webhooks, so unlike Toss there is no
 * charge-on-a-cron counterpart — this client only creates checkouts, reads
 * state, and flips subscription cancel flags.
 *
 * Production credentials are supplied only through protected ignored
 * environments. The API contract was previously verified against Polar's
 * sandbox; current production token/catalog/webhook evidence is tracked in
 * docs/PRODUCTION_CHECKLIST.md and must be rechecked before enabling sales.
 */

const POLAR_API_BASE =
  process.env.POLAR_API_URL ??
  (process.env.POLAR_SANDBOX ? "https://sandbox-api.polar.sh" : "https://api.polar.sh");

export class PolarNotConfiguredError extends Error {
  constructor() {
    super("POLAR_TOKEN is not configured");
    this.name = "PolarNotConfiguredError";
  }
}

export class PolarApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "PolarApiError";
  }
}

/**
 * Local sandbox-only SINGLE-PLAN test path. Purpose: let the Polar sandbox
 * workflow run against a sandbox workspace that currently has exactly ONE real
 * product price (there is no second PRO/PREMIUM price yet), while keeping the
 * order→plan mapping honest — we never fake a PREMIUM price id and never reuse
 * one price id for both plans (see docs/BILLING_POLAR.md → single-plan runbook).
 *
 * LAUNCH POLICY (since the $9.99 decision): the production catalog sells ONLY
 * PRO ($9.99 USD / month). `isPolarConfigured()` therefore requires the PRO
 * product+price ids (PREMIUM ids are optional / not-for-sale). PREMIUM checkout
 * is fail-closed in production: polarPriceIdForPlan/PolarProductIdForPlan throw
 * PolarNotConfiguredError for PREMIUM (the buying surfaces never render a CTA
 * for it either). The dev single-plan flags stay sandbox-only and are ignored
 * whenever POLAR_SANDBOX is not "1".
 *
 * FAULT-CLOSED guarantees (unit-tested in polar-client.test.ts):
 *  - In production (POLAR_SANDBOX unset) the dev flags are IGNORED; the gate
 *    requires POLAR_TOKEN + POLAR_PRO_PRICE_ID + POLAR_PRO_PRODUCT_ID.
 *  - PREMIUM checkout (production) always throws PolarNotConfiguredError.
 */
function devSinglePlan(): "PRO" | "PREMIUM" | null {
  if (process.env.POLAR_SANDBOX !== "1") return null;
  if (process.env.POLAR_DEV_SINGLE_PLAN === "pro") return "PRO";
  if (process.env.POLAR_DEV_SINGLE_PLAN === "premium") return "PREMIUM";
  return null;
}

function devSinglePriceId(): string | null {
  const plan = devSinglePlan();
  return plan && process.env.POLAR_TEST_PRICE_ID ? process.env.POLAR_TEST_PRICE_ID : null;
}

function devSingleProductId(): string | null {
  const plan = devSinglePlan();
  return plan && process.env.POLAR_TEST_PRODUCT_ID
    ? process.env.POLAR_TEST_PRODUCT_ID
    : null;
}

export function isPolarConfigured(): boolean {
  const token = Boolean(process.env.POLAR_TOKEN);
  // Dev single-plan mode (sandbox only) — ONE real sandbox product+price is enough.
  if (devSinglePlan() && devSinglePriceId() && devSingleProductId()) return token;
  // PRO-only launch gate: PRO checkout must be possible whenever the PRO
  // product+price are configured, without waiting on the (optional) PREMIUM ids.
  return Boolean(
    token && process.env.POLAR_PRO_PRICE_ID && process.env.POLAR_PRO_PRODUCT_ID,
  );
}

export function polarPriceIdForPlan(plan: "PRO" | "PREMIUM"): string {
  // Dev single-plan mode: only the chosen plan has a real price to open.
  if (devSinglePlan() && process.env.POLAR_TEST_PRICE_ID) {
    if (plan !== devSinglePlan()) throw new PolarNotConfiguredError();
    return process.env.POLAR_TEST_PRICE_ID;
  }
  // Production launch policy: PREMIUM is not-for-sale → always fail closed.
  if (plan === "PREMIUM") throw new PolarNotConfiguredError();
  const id = process.env.POLAR_PRO_PRICE_ID;
  if (!id) throw new PolarNotConfiguredError();
  return id;
}

export function polarProductIdForPlan(plan: "PRO" | "PREMIUM"): string {
  // Dev single-plan mode: only the chosen plan has a real product to open.
  if (devSinglePlan() && process.env.POLAR_TEST_PRODUCT_ID) {
    if (plan !== devSinglePlan()) throw new PolarNotConfiguredError();
    return process.env.POLAR_TEST_PRODUCT_ID;
  }
  // Production launch policy: PREMIUM is not-for-sale → always fail closed.
  if (plan === "PREMIUM") throw new PolarNotConfiguredError();
  const id = process.env.POLAR_PRO_PRODUCT_ID;
  if (!id) throw new PolarNotConfiguredError();
  return id;
}

/**
 * Maps a Polar price id back to its plan. In production this is used to
 * VERIFY an order's charged price id before any grant: a grant only holds for
 * PRO, and a price id that maps to PREMIUM (not-for-sale) or to nothing is a
 * rejection. The PREMIUM arm is kept so historical mapping stays lossless.
 */
export function polarPlanForPriceId(priceId: string): "PRO" | "PREMIUM" | null {
  // Dev single-plan mode: the one configured sandbox price maps to that plan.
  if (devSinglePlan() && process.env.POLAR_TEST_PRICE_ID) {
    return priceId === process.env.POLAR_TEST_PRICE_ID ? devSinglePlan() : null;
  }
  if (priceId === process.env.POLAR_PRO_PRICE_ID) return "PRO";
  if (priceId === process.env.POLAR_PREMIUM_PRICE_ID) return "PREMIUM";
  return null;
}

export type PolarCheckout = {
  id: string;
  status: string;
  url: string;
  total_amount: number;
  currency: string;
  /** Set once the checkout is confirmed (payment succeeded). */
  subscription_id?: string | null;
  product_id?: string;
  product_price_id?: string;
  customer_email?: string | null;
  metadata?: Record<string, unknown> | null;
  expires_at?: string | null;
};

export type PolarSubscription = {
  id: string;
  status:
    "active" | "past_due" | "canceled" | "revoked" | "incomplete" | "paused" | string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  amount?: number;
  currency?: string;
  product_price_id?: string;
  metadata?: Record<string, unknown> | null;
};

export type PolarOrderCustomer = {
  id: string;
  external_id?: string | null;
};

export type PolarOrder = {
  id: string;
  status: "paid" | "refunded" | "partially_refunded" | "pending" | "void" | string;
  total_amount: number;
  currency: string;
  paid_at?: string | null;
  subscription_id?: string | null;
  product_price_id?: string;
  customer?: PolarOrderCustomer | null;
  refunds?: { id: string; amount: number; reason?: string | null }[] | null;
  metadata?: Record<string, unknown> | null;
};

export type PolarRefund = {
  id: string;
  amount: number;
  reason?: string | null;
  created_at?: string | null;
};

/** Polar does not embed refunds in the order object/webhook — fetch them by
 * order_id (the authoritative refund list for the amount/id used on refund
 * records). */
export async function listPolarRefunds(orderId: string): Promise<PolarRefund[]> {
  const res = await polarFetch<{ items?: PolarRefund[] }>(
    `/v1/refunds/?limit=100&order_id=${encodeURIComponent(orderId)}`,
    { method: "GET" },
  );
  return res.items ?? [];
}

async function polarFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "PATCH"; body?: unknown },
): Promise<T> {
  const token = process.env.POLAR_TOKEN;
  if (!token) throw new PolarNotConfiguredError();

  const res = await fetch(`${POLAR_API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as unknown;
    throw new PolarApiError(`Polar API error (HTTP ${res.status})`, res.status, detail);
  }
  return (await res.json()) as T;
}

/**
 * Creates a hosted Checkout Session and returns it (use `.url` to redirect
 * the customer). `successUrl` may contain the literal placeholder
 * `{CHECKOUT_ID}` which Polar replaces with the real session id once the
 * checkout is confirmed — the caller passes the request origin.
 *
 * The current Polar API selects items by PRODUCT id (`products`), not by
 * price id; the price is resolved from the product's own price list. A
 * product with two available prices shows a price step; StudyOS products
 * each carry exactly one price, so the single matching price is applied
 * automatically (verified against the sandbox API).
 */
export async function createPolarCheckoutSession(input: {
  productId: string;
  customerEmail?: string | null;
  externalCustomerId: string;
  successUrl: string;
  metadata: Record<string, string>;
}): Promise<PolarCheckout> {
  return polarFetch<PolarCheckout>("/v1/checkouts/", {
    method: "POST",
    body: {
      products: [input.productId],
      customer_email: input.customerEmail ?? undefined,
      external_customer_id: input.externalCustomerId,
      success_url: input.successUrl,
      metadata: input.metadata,
    },
  });
}

export async function getPolarCheckout(checkoutId: string): Promise<PolarCheckout> {
  return polarFetch<PolarCheckout>(`/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
  });
}

export async function getPolarSubscription(
  subscriptionId: string,
): Promise<PolarSubscription> {
  return polarFetch<PolarSubscription>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "GET",
    },
  );
}

/** Sets (true) or clears (false) a subscription's "cancel at end of period"
 * flag — Polar's own equivalent of cancelSubscription/resumeSubscription. */
export async function updatePolarSubscription(input: {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}): Promise<PolarSubscription> {
  return polarFetch<PolarSubscription>(
    `/v1/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
    {
      method: "PATCH",
      body: { cancel_at_period_end: input.cancelAtPeriodEnd },
    },
  );
}

/**
 * Verifies a Polar webhook request. Polar signs the raw payload with HMAC-SHA256
 * and sends it in the `Polar-Signature` header (hex digest, no framing). As a
 * belt-and-braces fallback we also accept the Standard Webhooks framing
 * (`webhook-id.webhook-timestamp.<payload>`, `webhook-signature` header) that
 * older Polar clients sent. Either match must hold constant-time.
 *
 * Fail-Closed contract: the webhook route treats an unverifiable signature as
 * rejected (401/500), never as trusted — see app/api/webhooks/polar/route.ts.
 */
export function verifyPolarWebhookSignature(input: {
  payload: string;
  secret: string;
  signatureHeader?: string | null;
  webhookId?: string | null;
  webhookTimestamp?: string | null;
}): boolean {
  const key = Buffer.from(input.secret, "utf8");
  const candidates: Buffer[] = [];

  if (input.signatureHeader) {
    candidates.push(
      Buffer.from(
        createHmac("sha256", key).update(input.payload, "utf8").digest("hex"),
        "utf8",
      ),
    );
  }

  if (input.webhookId && input.webhookTimestamp && input.signatureHeader) {
    const framed = `${input.webhookId}.${input.webhookTimestamp}.${input.payload}`;
    const raw = createHmac("sha256", key).update(framed, "utf8").digest();
    candidates.push(Buffer.from(raw.toString("base64"), "utf8"));
  }

  const provided = (input.signatureHeader ?? "").split(",").map((s) => s.trim());
  for (const candidate of candidates) {
    for (const value of provided) {
      const given = Buffer.from(value, "utf8");
      if (candidate.length === given.length && timingSafeEqual(candidate, given)) {
        return true;
      }
    }
  }
  return false;
}
