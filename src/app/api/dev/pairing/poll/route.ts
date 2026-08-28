import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { pairingPollSchema } from "@/features/dev/agent-schema";
import { PAIRING_MAX_ATTEMPTS } from "@/features/dev/agent-config";

/**
 * POST /api/dev/pairing/poll — the still-running Local Agent calls this every
 * few seconds after /start (§5). No auth beyond knowing `pairingRequestId`,
 * which the agent itself minted the request for — this endpoint can only ever
 * reveal the state of a pairing flow the caller already initiated, never
 * enumerate others'.
 *
 * On the FIRST poll that observes status=APPROVED, this hands back the raw
 * device secret and immediately clears it from the row in the same update —
 * a read-once handoff (§6: the long-lived credential is never stored
 * recoverable in this database beyond that single delivery, and is never sent
 * to or displayed in the browser at all).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = pairingPollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid poll request." } }, { status: 400 });
  }

  const row = await prisma.devAgentPairingRequest.findUnique({ where: { id: parsed.data.pairingRequestId } });
  if (!row) {
    return NextResponse.json({ status: "EXPIRED" });
  }
  if (row.expiresAt.getTime() < Date.now() && row.status === "PENDING") {
    await prisma.devAgentPairingRequest.update({ where: { id: row.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ status: "EXPIRED" });
  }
  if (row.attempts >= PAIRING_MAX_ATTEMPTS) {
    return NextResponse.json({ status: "EXPIRED" });
  }

  if (row.status === "PENDING") {
    await prisma.devAgentPairingRequest.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ status: "PENDING" });
  }

  if (row.status === "APPROVED") {
    if (!row.deviceId || row.deviceSecretPlain === null) {
      // Already delivered on a previous poll — the secret is gone for good.
      return NextResponse.json({ status: "EXPIRED" });
    }
    const secret = row.deviceSecretPlain;
    const deviceId = row.deviceId;
    // Single-read handoff: clear the plaintext secret the instant it's picked up.
    await prisma.devAgentPairingRequest.update({
      where: { id: row.id },
      data: { deviceSecretPlain: null },
    });
    return NextResponse.json({ status: "APPROVED", deviceId, deviceSecret: secret });
  }

  return NextResponse.json({ status: row.status === "DENIED" ? "DENIED" : "EXPIRED" });
}
