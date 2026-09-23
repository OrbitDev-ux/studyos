import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * POST /api/webhooks/polar — fail-closed webhook contract:
 *  - no POLAR_WEBHOOK_SECRET → 500 (don't process, don't acknowledge; Polar
 *    retries rather than us silently dropping a paid order)
 *  - bad/missing signature → 401, before ANY state is touched
 *  - malformed body → 400
 *  - signature ok → dispatch to applyPolarWebhook (itself idempotent); a
 *    processing throw surfaces as 500 so Polar retries.
 * The real HMAC verifier runs here (only polar-events is mocked) so the
 * measured thing is the route's signature gate + dispatch.
 */
vi.mock("server-only", () => ({}));

const { applyPolarWebhook } = vi.hoisted(() => ({ applyPolarWebhook: vi.fn() }));
vi.mock("@/features/billing/polar-events", () => ({ applyPolarWebhook }));

import { POST } from "@/app/api/webhooks/polar/route";

const PAYLOAD = JSON.stringify({ id: "evt_1", type: "order.paid", data: { id: "ord_1" } });
const SECRET = "polar_whs_test_secret";

function signedHeaders(overrides: Record<string, string> = {}) {
  return {
    "Polar-Signature": createHmac("sha256", SECRET).update(PAYLOAD, "utf8").digest("hex"),
    ...overrides,
  };
}

function callPost(headers: Record<string, string>, body: string = PAYLOAD) {
  return POST(new Request("http://localhost/api/webhooks/polar", { method: "POST", headers, body }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("POLAR_WEBHOOK_SECRET", SECRET);
  applyPolarWebhook.mockResolvedValue(undefined);
});

describe("POST /api/webhooks/polar", () => {
  it("returns 500 when POLAR_WEBHOOK_SECRET is missing — never process unverifiable events", async () => {
    vi.stubEnv("POLAR_WEBHOOK_SECRET", "");

    const res = await callPost(signedHeaders());

    expect(res.status).toBe(500);
    expect(applyPolarWebhook).not.toHaveBeenCalled();
  });

  it("rejects a bad signature with 401 without touching billing state", async () => {
    const res = await callPost({
      "Polar-Signature": createHmac("sha256", "wrong-secret").update(PAYLOAD).digest("hex"),
    });

    expect(res.status).toBe(401);
    expect(applyPolarWebhook).not.toHaveBeenCalled();
  });

  it("rejects a missing signature header with 401", async () => {
    const res = await callPost({});

    expect(res.status).toBe(401);
    expect(applyPolarWebhook).not.toHaveBeenCalled();
  });

  it("returns 400 for unparseable JSON", async () => {
    const res = await callPost(signedHeaders(), "not-json");

    expect(res.status).toBe(400);
    expect(applyPolarWebhook).not.toHaveBeenCalled();
  });

  it("returns 200 and dispatches a correctly signed event", async () => {
    const res = await callPost(signedHeaders());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(applyPolarWebhook).toHaveBeenCalledWith({ id: "evt_1", type: "order.paid", data: { id: "ord_1" } });
  });

  it("returns 400 for an event missing id/type even when signed", async () => {
    const body = JSON.stringify({ data: {} });

    const res = await callPost(
      {
        "Polar-Signature": createHmac("sha256", SECRET).update(body, "utf8").digest("hex"),
      },
      body,
    );

    expect(res.status).toBe(400);
    expect(applyPolarWebhook).not.toHaveBeenCalled();
  });

  it("accepts Standard Webhooks deliveries whose event id lives in the webhook-id header (polar listen format)", async () => {
    const body = JSON.stringify({
      type: "order.paid",
      timestamp: "2026-09-22T00:00:00Z",
      api_version: "2024-01-01",
      data: { id: "ord_2" },
    });
    const webhookId = "evt_wh_123";
    const webhookTimestamp = "2026-09-22T00:00:00Z";
    const framed = `${webhookId}.${webhookTimestamp}.${body}`;
    const signature = `v1,${createHmac("sha256", SECRET).update(framed, "utf8").digest("base64")}`;

    const res = await callPost(
      { "webhook-id": webhookId, "webhook-timestamp": webhookTimestamp, "webhook-signature": signature },
      body,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(applyPolarWebhook).toHaveBeenCalledWith({
      id: "evt_wh_123",
      type: "order.paid",
      data: { id: "ord_2" },
    });
  });

  it("returns 500 when processing fails so Polar can retry", async () => {
    applyPolarWebhook.mockRejectedValue(new Error("db down"));

    const res = await callPost(signedHeaders());

    expect(res.status).toBe(500);
  });
});