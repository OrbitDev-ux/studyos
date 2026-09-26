import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, init) },
}));
const { runBillingRenewals } = vi.hoisted(() => ({ runBillingRenewals: vi.fn() }));
vi.mock("@/features/billing/renewal", () => ({ runBillingRenewals }));
vi.mock("@/features/billing/providers", () => ({ FREE_ONLY_MODE: true }));

import { GET } from "./route";

describe("billing renewal cron under FREE_ONLY policy", () => {
  it("does not invoke the legacy charge runner", async () => {
    const response = await GET(new Request("https://studyos.test/api/cron/billing-renewals"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ disabled: true, reason: "free_only" });
    expect(runBillingRenewals).not.toHaveBeenCalled();
  });
});
