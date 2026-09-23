import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  PolarNotConfiguredError,
  createPolarCheckoutSession,
  isPolarConfigured,
  polarPlanForPriceId,
  polarPriceIdForPlan,
  polarProductIdForPlan,
  verifyPolarWebhookSignature,
} from "@/features/billing/polar-client";

const envBackup = { ...process.env };

/**
 * The dev-only single-plan sandbox path (POLAR_DEV_SINGLE_PLAN): lets the
 * sandbox workflow run against a workspace that has exactly ONE real product
 * price, WITHOUT faking a second price id. Production fail-closed means the
 * dev flags are ignored whenever POLAR_SANDBOX is not "1" — the gate requires
 * the PRO product+price ids there (PREMIUM ids are optional since PRO is the
 * only for-sale plan).
 */
beforeEach(() => {
  process.env = { ...envBackup };
});

describe("dev single-plan sandbox gate (DOCUMENTS production fail-closed)", () => {
  it("is IGNORED outside sandbox: dev flags set, POLAR_SANDBOX unset → provider stays OFF", () => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";

    expect(process.env.POLAR_SANDBOX).toBeUndefined();
    expect(isPolarConfigured()).toBe(false);
  });

  it("is IGNORED when POLAR_DEV_SINGLE_PLAN is not exactly pro/premium", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";
    process.env.POLAR_DEV_SINGLE_PLAN = "GOLD";

    // Without the exact flag the normal two-id gate applies and fails.
    expect(isPolarConfigured()).toBe(false);
  });

  it("PRO can be checked out in production WITHOUT any PREMIUM ids (launch contract)", () => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_PRO_PRICE_ID = "price_pro";
    process.env.POLAR_PRO_PRODUCT_ID = "product_pro";
    // No POLAR_PREMIUM_* at all — allowed: PREMIUM is not-for-sale.
    expect(isPolarConfigured()).toBe(true);
    expect(polarPriceIdForPlan("PRO")).toBe("price_pro");
    expect(polarProductIdForPlan("PRO")).toBe("product_pro");
  });

  it("stays OFF when the PRO price id is missing even if PREMIUM ids are set", () => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_PREMIUM_PRICE_ID = "price_premium";
    process.env.POLAR_PREMIUM_PRODUCT_ID = "product_premium";
    expect(isPolarConfigured()).toBe(false);
  });

  it("stays OFF when the PRO product id is missing even if PREMIUM ids are set", () => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_PRO_PRICE_ID = "price_pro";
    process.env.POLAR_PREMIUM_PRICE_ID = "price_premium";
    process.env.POLAR_PREMIUM_PRODUCT_ID = "product_premium";
    expect(isPolarConfigured()).toBe(false);
  });

  it("ignores the dev single-plan flags when POLAR_SANDBOX is not 1", () => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";
    process.env.POLAR_PRO_PRICE_ID = "price_pro";
    process.env.POLAR_PRO_PRODUCT_ID = "product_pro";

    expect(process.env.POLAR_SANDBOX).toBeUndefined();
    expect(isPolarConfigured()).toBe(true);
    // Production path resolves the configured PRO ids, NOT the sandbox test id.
    expect(polarPriceIdForPlan("PRO")).toBe("price_pro");
  });

  it("is IGNORED when no real sandbox price id is provided", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";

    expect(isPolarConfigured()).toBe(false);
  });

  it("is IGNORED when no real sandbox product id is provided", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";

    expect(isPolarConfigured()).toBe(false);
  });

  it("activates in sandbox with token + dev flag + one real product and price id", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";

    expect(isPolarConfigured()).toBe(true);
    expect(polarPriceIdForPlan("PRO")).toBe("price_sandbox_pro");
    expect(polarProductIdForPlan("PRO")).toBe("product_sandbox_pro");
  });

  it("fails closed for the plan that has no product/price in single-plan sandbox (no same-id reuse)", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "pro";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_pro";

    expect(() => polarPriceIdForPlan("PREMIUM")).toThrow(PolarNotConfiguredError);
    expect(() => polarProductIdForPlan("PREMIUM")).toThrow(PolarNotConfiguredError);
  });

  it("maps the single sandbox price id to its plan and nothing else", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_DEV_SINGLE_PLAN = "premium";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_premium";
    process.env.POLAR_TEST_PRODUCT_ID = "product_sandbox_premium";

    expect(polarPlanForPriceId("price_sandbox_premium")).toBe("PREMIUM");
    expect(polarPlanForPriceId("price_unknown")).toBeNull();
  });

  it("still requires BOTH PRO ids (price and product) even with sandbox flags polluting the env", () => {
    process.env.POLAR_SANDBOX = "1";
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_PRO_PRICE_ID = "price_pro";
    process.env.POLAR_PREMIUM_PRICE_ID = "price_premium";
    process.env.POLAR_TEST_PRICE_ID = "price_sandbox_pro";
    // NOTE: no POLAR_DEV_SINGLE_PLAN + no PRO product id → the PRO-only gate
    // must stay OFF despite the sandbox test price being present.
    expect(isPolarConfigured()).toBe(false);
  });
});

describe("polarProductIdForPlan (production mapping)", () => {
  beforeEach(() => {
    process.env.POLAR_PRO_PRODUCT_ID = "product_pro";
    process.env.POLAR_PREMIUM_PRODUCT_ID = "product_premium";
  });

  it("maps PRO to its configured product id in production", () => {
    expect(polarProductIdForPlan("PRO")).toBe("product_pro");
  });

  it("fails closed for PREMIUM in production — not-for-sale, even when an id is configured", () => {
    expect(() => polarProductIdForPlan("PREMIUM")).toThrow(PolarNotConfiguredError);
  });

  it("fails closed when the PRO product id is missing", () => {
    delete process.env.POLAR_PRO_PRODUCT_ID;
    expect(() => polarProductIdForPlan("PRO")).toThrow(PolarNotConfiguredError);
  });
});

describe("createPolarCheckoutSession request body", () => {
  beforeEach(() => {
    process.env.POLAR_TOKEN = "t";
    process.env.POLAR_API_URL = "https://sandbox-api.polar.sh";
  });

  it("POSTs products-by-id (current Polar API) and forwards customer/external/success/metadata", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "co_1",
            url: "https://sandbox.polar.sh/checkout/co_1",
            status: "open",
          }),
          { status: 201 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createPolarCheckoutSession({
      productId: "product_sandbox_pro",
      customerEmail: "dev@example.org",
      externalCustomerId: "user_1",
      successUrl:
        "https://app.example.com/billing/callback?plan=PRO&checkout_id={CHECKOUT_ID}",
      metadata: { plan: "PRO", userId: "user_1" },
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [, init] = call as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({
        products: ["product_sandbox_pro"],
        customer_email: "dev@example.org",
        external_customer_id: "user_1",
        success_url:
          "https://app.example.com/billing/callback?plan=PRO&checkout_id={CHECKOUT_ID}",
        metadata: { plan: "PRO", userId: "user_1" },
      }),
    );
    vi.unstubAllGlobals();
  });
});

/** The webhook trust boundary: only correctly-signed payloads reach
 * polar-events.ts. Polar signs the RAW payload with HMAC-SHA256 hex in the
 * `Polar-Signature` header; we also accept the Standard-Webhooks framing
 * (webhook-id.timestamp.payload) some clients send. Both must be constant-time
 * compared and a mismatch is a hard reject, never a pass. */
const PAYLOAD = '{"type":"order.paid","id":"evt_1","data":{"id":"ord_1"}}';
const SECRET = "polar_whs_test_secret";

describe("verifyPolarWebhookSignature", () => {
  it("accepts a valid Polar-Signature (hex HMAC-SHA256 of the raw payload)", () => {
    const signature = createHmac("sha256", SECRET).update(PAYLOAD, "utf8").digest("hex");

    expect(
      verifyPolarWebhookSignature({
        payload: PAYLOAD,
        secret: SECRET,
        signatureHeader: signature,
      }),
    ).toBe(true);
  });

  it("rejects a signature produced with the wrong secret", () => {
    const signature = createHmac("sha256", "another-secret")
      .update(PAYLOAD, "utf8")
      .digest("hex");

    expect(
      verifyPolarWebhookSignature({
        payload: PAYLOAD,
        secret: SECRET,
        signatureHeader: signature,
      }),
    ).toBe(false);
  });

  it("rejects a completely missing signature header", () => {
    expect(
      verifyPolarWebhookSignature({
        payload: PAYLOAD,
        secret: SECRET,
        signatureHeader: null,
      }),
    ).toBe(false);
  });

  it("rejects a signature for a tampered payload", () => {
    const signature = createHmac("sha256", SECRET).update(PAYLOAD, "utf8").digest("hex");

    expect(
      verifyPolarWebhookSignature({
        payload: PAYLOAD.replace("ord_1", "ord_9"),
        secret: SECRET,
        signatureHeader: signature,
      }),
    ).toBe(false);
  });

  it("accepts the Standard-Webhooks framing (webhook-id.timestamp.payload)", () => {
    const id = "msg_123";
    const ts = "1730000000";
    const framed = `${id}.${ts}.${PAYLOAD}`;
    const signature = createHmac("sha256", SECRET)
      .update(framed, "utf8")
      .digest("base64");

    expect(
      verifyPolarWebhookSignature({
        payload: PAYLOAD,
        secret: SECRET,
        signatureHeader: `v1,${signature}`,
        webhookId: id,
        webhookTimestamp: ts,
      }),
    ).toBe(true);
  });
});
