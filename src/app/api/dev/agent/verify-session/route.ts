import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDeviceAuth } from "@/features/dev/agent-server-auth";
import { agentVerifySessionSchema } from "@/features/dev/agent-schema";
import { isReadPermission, type DevPermission } from "@/features/dev/agent-config";

/**
 * POST /api/dev/agent/verify-session — the Local Agent calls this, device-
 * authenticated, the moment a browser (same machine) opens a new file/
 * terminal/git connection with a session token minted by createAgentSession.
 * This is the ONE place a browser-presented token is ever validated: single
 * use (consumedAt), short-lived (expiresAt), and re-checks the permission
 * grant server-side too — defense in depth even though the agent also caches
 * and enforces the same grants locally from its last heartbeat (§14/§21).
 *
 * Deliberately synchronous-over-HTTP rather than a locally-verifiable signed
 * token: it keeps StudyOS Web as the single source of truth for permission
 * grants (a revoke takes effect on the very next session, not after some
 * cached secret's TTL) and means the agent never needs to hold a symmetric
 * secret StudyOS Web can also derive — it only ever proves identity with its
 * own device secret (§6: no long-lived credential is ever recoverable from
 * this database).
 */
export async function POST(request: NextRequest) {
  const device = await requireDeviceAuth(request.headers.get("authorization"));
  if (!device) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Invalid or revoked device credential." } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = agentVerifySessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid request." } }, { status: 400 });
  }

  const session = await prisma.devAgentSession.findUnique({ where: { id: parsed.data.sessionToken } });
  if (
    !session ||
    session.deviceId !== device.id ||
    session.consumedAt ||
    session.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_SESSION", message: "Session token is invalid or expired." } }, { status: 401 });
  }

  const scope = session.scope as DevPermission;
  if (!isReadPermission(scope)) {
    const grant = await prisma.devAgentPermissionGrant.findUnique({
      where: { deviceId_permission: { deviceId: device.id, permission: scope } },
    });
    if (!grant || grant.revokedAt) {
      return NextResponse.json({ ok: false, error: { code: "PERMISSION_DENIED", message: "Permission was revoked." } }, { status: 403 });
    }
  }

  await prisma.devAgentSession.update({ where: { id: session.id }, data: { consumedAt: new Date() } });

  return NextResponse.json({ ok: true, userId: session.userId, scope: session.scope });
}
