import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * POST /api/webhooks/toss had zero test coverage despite being the newest,
 * highest-risk code in the billing pipeline (Toss sends no HMAC/signature on
 * webhooks, so this route is the one place StudyOS accepts an unauthenticated
 * external POST that can trigger a DB write). Covers: the untrusted-body
 * re-verification via getTossPayment, the "only act on cancellations" filter,
 * the "no record of this payment" guard, and that a processing failure
 * returns non-2xx so Toss retries instead of silently dropping the event.
 */
const { payment } = vi.hoisted(() => ({ payment: { findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { payment } }));

const { applyRefundEvent } = vi.hoisted(() => ({ applyRefundEvent: vi.fn() }));
vi.mock("@/features/billing/payment-service", () => ({ applyRefundEvent }));

const { getTossPayment } = vi.hoisted(() => ({ getTossPayment: vi.fn() }));
vi.mock("@/features/billing/toss-client", () => ({ getTossPayment }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/webhooks/toss";

function webhookRequest(body: unknown) {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  applyRefundEvent.mockResolvedValue({});
});

describe("POST /api/webhooks/toss", () => {
  it("returns 400 on an unparsable body", async () => {
    const req = new NextRequest(URL, { method: "POST", body: "not json" });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(getTossPayment).not.toHaveBeenCalled();
  });

  it("acknowledges without acting when the event type carries no paymentKey (e.g. BrandPay/payout events)", async () => {
    const res = await POST(webhookRequest({ eventType: "METHOD_UPDATED", data: {} }));

    expect(res.status).toBe(200);
    expect(getTossPayment).not.toHaveBeenCalled();
  });

  it("never trusts the raw webhook body's status — always re-fetches from Toss", async () => {
    getTossPayment.mockResolvedValue({ paymentKey: "pay-1", status: "DONE" });

    const res = await POST(
      webhookRequest({ eventType: "PAYMENT_STATUS_CHANGED", data: { paymentKey: "pay-1", status: "CANCELED" } }),
    );

    expect(getTossPayment).toHaveBeenCalledWith("pay-1");
    // The body claimed CANCELED, but Toss's own record says DONE — must not act.
    expect(applyRefundEvent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("does not act on a non-cancellation status change (e.g. DONE)", async () => {
    getTossPayment.mockResolvedValue({ paymentKey: "pay-1", status: "DONE" });

    const res = await POST(webhookRequest({ data: { paymentKey: "pay-1" } }));

    expect(applyRefundEvent).not.toHaveBeenCalled();
    expect(payment.findUnique).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("is a no-op for a cancellation on a payment StudyOS has no record of", async () => {
    getTossPayment.mockResolvedValue({ paymentKey: "unknown-pay", status: "CANCELED", cancels: [] });
    payment.findUnique.mockResolvedValue(null);

    const res = await POST(webhookRequest({ data: { paymentKey: "unknown-pay" } }));

    expect(applyRefundEvent).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("applies a refund event for a known payment's CANCELED status", async () => {
    getTossPayment.mockResolvedValue({
      paymentKey: "pay-1",
      status: "CANCELED",
      cancels: [
        {
          transactionKey: "cancel-tx-1",
          cancelAmount: 4900,
          cancelStatus: "DONE",
          cancelReason: "고객 요청",
          canceledAt: "2026-08-26T00:00:00Z",
        },
      ],
    });
    payment.findUnique.mockResolvedValue({ id: "db-pay-1", amount: 4900 });

    const res = await POST(webhookRequest({ data: { paymentKey: "pay-1" } }));

    expect(applyRefundEvent).toHaveBeenCalledWith({
      paymentId: "db-pay-1",
      amount: 4900,
      status: "SUCCEEDED",
      reason: "고객 요청",
      provider: "toss",
      externalRefundId: "cancel-tx-1",
      processedAt: new Date("2026-08-26T00:00:00Z"),
    });
    expect(res.status).toBe(200);
  });

  it("also applies for PARTIAL_CANCELED", async () => {
    getTossPayment.mockResolvedValue({
      paymentKey: "pay-2",
      status: "PARTIAL_CANCELED",
      cancels: [
        {
          transactionKey: "cancel-tx-2",
          cancelAmount: 2000,
          cancelStatus: "DONE",
          cancelReason: "부분 환불",
          canceledAt: "2026-08-26T00:00:00Z",
        },
      ],
    });
    payment.findUnique.mockResolvedValue({ id: "db-pay-2", amount: 4900 });

    const res = await POST(webhookRequest({ data: { paymentKey: "pay-2" } }));

    expect(applyRefundEvent).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "db-pay-2", amount: 2000 }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 500 (so Toss retries) when the Toss lookup itself fails", async () => {
    getTossPayment.mockRejectedValue(new Error("toss api down"));

    const res = await POST(webhookRequest({ data: { paymentKey: "pay-1" } }));

    expect(res.status).toBe(500);
  });

  it("returns 500 (so Toss retries) when applying the refund event fails", async () => {
    getTossPayment.mockResolvedValue({ paymentKey: "pay-1", status: "CANCELED", cancels: [] });
    payment.findUnique.mockResolvedValue({ id: "db-pay-1", amount: 4900 });
    applyRefundEvent.mockRejectedValue(new Error("db down"));

    const res = await POST(webhookRequest({ data: { paymentKey: "pay-1" } }));

    expect(res.status).toBe(500);
  });
});
