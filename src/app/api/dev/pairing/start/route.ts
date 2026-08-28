import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ip";
import { generatePairingCode, hashPairingCode } from "@/features/dev/agent-crypto";
import { pairingStartSchema } from "@/features/dev/agent-schema";
import {
  PAIRING_CODE_TTL_MS,
  PAIRING_START_MAX_PER_IP,
  PAIRING_START_RATE_WINDOW_MS,
} from "@/features/dev/agent-config";

/**
 * POST /api/dev/pairing/start — the ONE endpoint an unpaired Local Agent can
 * call with no credential at all (§5 device-code flow, RFC 8628-style). The
 * agent has no StudyOS session; it only self-reports a display hint (hostname,
 * platform) that a signed-in human later confirms in the browser before any
 * device row is created. Never requires — or accepts — auth.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = pairingStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid pairing request." } }, { status: 400 });
  }

  // IP-scoped rate limit — mirrors features/auth/reset-actions.ts's pattern,
  // counted from this table's own rows (no extra table needed).
  const ip = getClientIp(request.headers);
  if (ip) {
    const since = new Date(Date.now() - PAIRING_START_RATE_WINDOW_MS);
    const recent = await prisma.devAgentPairingRequest.count({
      where: { requestIp: ip, createdAt: { gte: since } },
    });
    if (recent >= PAIRING_START_MAX_PER_IP) {
      return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Too many pairing attempts. Try again later." } }, { status: 429 });
    }
  }

  // Regenerate on the rare hash collision instead of failing the request.
  let code = generatePairingCode();
  let userCodeHash = hashPairingCode(code);
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await prisma.devAgentPairingRequest.findUnique({ where: { userCodeHash }, select: { id: true } });
    if (!existing) break;
    code = generatePairingCode();
    userCodeHash = hashPairingCode(code);
  }

  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
  const row = await prisma.devAgentPairingRequest.create({
    data: {
      userCodeHash,
      deviceName: parsed.data.deviceName ?? null,
      platform: parsed.data.platform ?? null,
      requestIp: ip || null,
      expiresAt,
    },
    select: { id: true },
  });

  return NextResponse.json({
    pairingRequestId: row.id,
    userCode: code,
    expiresInSeconds: Math.floor(PAIRING_CODE_TTL_MS / 1000),
  });
}
