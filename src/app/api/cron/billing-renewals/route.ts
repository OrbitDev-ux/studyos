import { NextResponse } from "next/server";
import { runBillingRenewals } from "@/features/billing/renewal";

/**
 * GET /api/cron/billing-renewals — invoked daily by Vercel Cron (see
 * vercel.json). Vercel signs cron requests with `Authorization: Bearer
 * ${CRON_SECRET}` when that env var is set; without it, this endpoint would
 * be a public trigger for arbitrary card charges, so it fails closed if the
 * secret isn't configured rather than allowing unauthenticated requests
 * through.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await runBillingRenewals();
  return NextResponse.json(summary);
}
