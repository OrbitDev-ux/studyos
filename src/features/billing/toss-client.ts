import "server-only";

/**
 * Thin REST client for Toss Payments' recurring "billing key" API
 * (https://docs.tosspayments.com/guides/v2/billing/integration). Server-only:
 * every call needs TOSS_SECRET_KEY, which must never reach the client.
 *
 * Toss webhooks carry no HMAC/signature (see docs.tosspayments.com/guides/v2/webhook) —
 * the only trustworthy source of truth is calling back into this API with the
 * secret key. Callers must treat webhook payloads as a mere "something
 * changed, go look" trigger and re-fetch via getTossPayment before applying
 * any entitlement change (see app/api/webhooks/toss/route.ts).
 */

const TOSS_API_BASE = "https://api.tosspayments.com";

export class TossNotConfiguredError extends Error {
  constructor() {
    super("TOSS_SECRET_KEY is not configured");
    this.name = "TossNotConfiguredError";
  }
}

export class TossApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TossApiError";
  }
}

function secretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new TossNotConfiguredError();
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

async function tossFetch<T>(
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; body?: unknown; idempotencyKey?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { code?: string; message?: string })
    | null;

  if (!res.ok) {
    throw new TossApiError(
      json?.message ?? `Toss API error (HTTP ${res.status})`,
      json?.code,
      res.status,
    );
  }
  return json as T;
}

export type TossBillingKeyResponse = {
  billingKey: string;
  customerKey: string;
  cardCompany?: string;
  cardNumber?: string;
};

/** Exchanges the one-time `authKey` from a successful requestBillingAuth
 * redirect for a durable billingKey. Call exactly once per registration —
 * the authKey is single-use. */
export async function issueBillingKey(input: {
  authKey: string;
  customerKey: string;
}): Promise<TossBillingKeyResponse> {
  return tossFetch<TossBillingKeyResponse>("/v1/billing/authorizations/issue", {
    method: "POST",
    body: { authKey: input.authKey, customerKey: input.customerKey },
  });
}

export type TossPaymentStatus =
  | "READY"
  | "IN_PROGRESS"
  | "WAITING_FOR_DEPOSIT"
  | "DONE"
  | "CANCELED"
  | "PARTIAL_CANCELED"
  | "ABORTED"
  | "EXPIRED";

export type TossCancelRecord = {
  transactionKey: string;
  cancelAmount: number;
  cancelStatus: string;
  cancelReason: string;
  canceledAt: string;
};

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  status: TossPaymentStatus;
  totalAmount: number;
  approvedAt?: string;
  cancels?: TossCancelRecord[];
};

/** Charges a previously-issued billing key. Pass a fresh idempotencyKey per
 * logical charge attempt (e.g. `renewal:{subscriptionId}:{periodEndISODate}`)
 * so a retried request never double-charges the card. */
export async function chargeBillingKey(input: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  idempotencyKey: string;
}): Promise<TossPayment> {
  return tossFetch<TossPayment>(`/v1/billing/${encodeURIComponent(input.billingKey)}`, {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      customerKey: input.customerKey,
      amount: input.amount,
      orderId: input.orderId,
      orderName: input.orderName,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
    },
  });
}

/** The authoritative lookup used to verify a webhook notification before
 * trusting it — never trust status/amount fields from the webhook body itself. */
export async function getTossPayment(paymentKey: string): Promise<TossPayment> {
  return tossFetch<TossPayment>(`/v1/payments/${encodeURIComponent(paymentKey)}`, {
    method: "GET",
  });
}

export async function getTossPaymentByOrderId(orderId: string): Promise<TossPayment> {
  return tossFetch<TossPayment>(`/v1/payments/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function cancelTossPayment(input: {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
  idempotencyKey: string;
}): Promise<TossPayment> {
  return tossFetch<TossPayment>(`/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`, {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      cancelReason: input.cancelReason,
      ...(input.cancelAmount != null ? { cancelAmount: input.cancelAmount } : {}),
    },
  });
}

/** Best-effort cleanup for a billing key that was issued but never
 * successfully charged (e.g. the first charge failed) — nothing in our DB
 * references it yet, so leaving it live at Toss serves no purpose. */
export async function deleteBillingKey(billingKey: string): Promise<void> {
  await tossFetch<unknown>(`/v1/billing/${encodeURIComponent(billingKey)}`, {
    method: "DELETE",
  });
}

export function isTossConfigured(): boolean {
  return Boolean(process.env.TOSS_SECRET_KEY);
}
