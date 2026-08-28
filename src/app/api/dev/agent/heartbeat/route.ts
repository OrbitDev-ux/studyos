import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDeviceAuth } from "@/features/dev/agent-server-auth";
import { agentHeartbeatSchema } from "@/features/dev/agent-schema";
import { DEV_GRANTABLE_PERMISSIONS } from "@/features/dev/agent-config";

/**
 * POST /api/dev/agent/heartbeat — the running Local Agent calls this
 * periodically (device-authenticated). Updates lastSeenAt (drives the
 * browser's "● Local Agent Connected" dot, §25) and self-reports the loopback
 * port it's listening on so a browser on the SAME machine knows where to
 * connect (§3 — StudyOS Web itself never talks to this port). Returns the
 * device's current permission grants so the agent's own local enforcement
 * (§14 defense-in-depth) always reflects the latest state even if the user
 * changed it in another tab.
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
  const parsed = agentHeartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid heartbeat." } }, { status: 400 });
  }

  await prisma.devAgentDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), localPort: parsed.data.localPort },
  });

  const grants = await prisma.devAgentPermissionGrant.findMany({
    where: { deviceId: device.id, revokedAt: null },
    select: { permission: true },
  });
  const granted = new Set(grants.map((g) => g.permission));

  return NextResponse.json({
    ok: true,
    permissions: Object.fromEntries(DEV_GRANTABLE_PERMISSIONS.map((p) => [p, granted.has(p)])),
  });
}
