import "server-only";

export type PaymentProviderName = "mock";

export type CheckoutRequest = {
  userId: string;
  plan: "PRO" | "PREMIUM";
  amount: number;
  currency: string;
  idempotencyKey: string;
};

export type CheckoutResult = {
  provider: PaymentProviderName;
  status: "NOT_CONFIGURED";
};

/** Provider boundary for future PG integrations. This implementation never
 * contacts a payment service or changes a user's entitlements. */
export interface PaymentProvider {
  createCheckout(input: CheckoutRequest): Promise<CheckoutResult>;
}

export const mockPaymentProvider: PaymentProvider = {
  async createCheckout() {
    return { provider: "mock", status: "NOT_CONFIGURED" };
  },
};

export function getPaymentProvider(): PaymentProvider {
  // Keep provider selection server-side and deliberately fail closed until a
  // real provider is implemented and reviewed.
  return mockPaymentProvider;
}
