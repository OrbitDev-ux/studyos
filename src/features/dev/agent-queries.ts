import "server-only";
import { prisma } from "@/lib/prisma";
import { AGENT_ONLINE_WINDOW_MS, DEV_GRANTABLE_PERMISSIONS, type DevPermission } from "@/features/dev/agent-config";

export type DeviceSummary = {
  id: string;
  name: string;
  platform: string | null;
  localPort: number | null;
  lastSeenAt: string | null;
  online: boolean;
  createdAt: string;
  grants: Record<DevPermission, boolean>;
};

/** Every non-revoked device paired to this user, ownership always scoped by
 * `userId` in the WHERE clause — no route param anywhere lets a client ask
 * for another user's device (mirrors DevWorkspace's queries.ts note). */
export async function listMyDevices(userId: string): Promise<DeviceSummary[]> {
  const devices = await prisma.devAgentDevice.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "asc" },
    include: { grants: { where: { revokedAt: null } } },
  });

  const now = Date.now();
  return devices.map((d) => {
    const grants = Object.fromEntries(
      DEV_GRANTABLE_PERMISSIONS.map((p) => [p, d.grants.some((g) => g.permission === p)]),
    ) as Record<DevPermission, boolean>;
    return {
      id: d.id,
      name: d.name,
      platform: d.platform,
      localPort: d.localPort,
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : null,
      online: !!d.lastSeenAt && now - d.lastSeenAt.getTime() < AGENT_ONLINE_WINDOW_MS,
      createdAt: d.createdAt.toISOString(),
      grants,
    };
  });
}

export async function getMyDevice(userId: string, deviceId: string) {
  return prisma.devAgentDevice.findFirst({ where: { id: deviceId, userId, revokedAt: null } });
}
