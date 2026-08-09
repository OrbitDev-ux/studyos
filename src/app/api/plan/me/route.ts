import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlanSummary } from "@/features/billing/usage";

// GET /api/plan/me — the current user's plan, trial status, feature access, and
// usage. Server-authoritative: the plan/trial come from the DB + server clock,
// never from anything the client sends. 401 when unauthenticated.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const summary = await getPlanSummary(session.user.id);
  return NextResponse.json({
    plan: summary.plan,
    status: summary.status,
    trialEndsAt: summary.trialEndsAt,
    trialDaysRemaining: summary.trialDaysRemaining,
    features: summary.features,
  });
}
