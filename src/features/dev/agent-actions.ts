"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { hashPairingCode, generateDeviceSecret, hashDeviceSecret } from "@/features/dev/agent-crypto";
import { AGENT_SESSION_TTL_MS, isReadPermission, type DevPermission } from "@/features/dev/agent-config";
import { deviceNameSchema, pairingCodeSchema, permissionSchema } from "@/features/dev/agent-schema";
import { getMyDevice, listMyDevices, type DeviceSummary } from "@/features/dev/agent-queries";

export type DevActionError = { error?: string; code?: "ENTITLEMENT_BLOCKED" | "NOT_FOUND" | "PERMISSION_DENIED" };

async function requireDevEntitlement(
  user: Awaited<ReturnType<typeof requireCurrentUser>>,
): Promise<DevActionError | null> {
  if (!canUseFeature(accessStateFor(user), "DEV_WORKSPACE")) {
    return { error: "Study OS Dev is not available on your current plan.", code: "ENTITLEMENT_BLOCKED" };
  }
  return null;
}

// ── Pairing (§5) — approval is the ONLY step that happens in the browser;
// the device-code exchange itself is agent ⇄ Route Handler, see
// app/api/dev/pairing/{start,poll}. ──────────────────────────────────────

export type PendingPairing = { deviceName: string; platform: string | null } & DevActionError;

/** Looks up a pending pairing request by the code the user read off their
 * terminal and typed into /dev/pair — never by a route param, so a client
 * can only ever see requests it can already prove knowledge of the code for. */
export async function getPendingPairing(rawCode: string): Promise<PendingPairing> {
  await requireCurrentUser();
  const parsed = pairingCodeSchema.safeParse(rawCode);
  if (!parsed.success) return { error: "코드 형식이 올바르지 않습니다.", deviceName: "", platform: null };

  const row = await prisma.devAgentPairingRequest.findUnique({
    where: { userCodeHash: hashPairingCode(parsed.data) },
    select: { status: true, expiresAt: true, deviceName: true, platform: true },
  });
  if (!row || row.status !== "PENDING" || row.expiresAt.getTime() < Date.now()) {
    return { error: "코드가 만료되었거나 유효하지 않습니다.", deviceName: "", platform: null, code: "NOT_FOUND" };
  }
  return { deviceName: row.deviceName ?? "Unknown device", platform: row.platform };
}

/** User clicks "Allow" (§5's "[Allow] [Cancel]"). Mints the device's
 * long-lived secret HERE, stages it (once, transiently) for the still-polling
 * agent to retrieve, and stores only its hash from now on (§6). */
export async function approvePairing(rawCode: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const blocked = await requireDevEntitlement(user);
  if (blocked) return blocked;

  const parsed = pairingCodeSchema.safeParse(rawCode);
  if (!parsed.success) return { error: "코드 형식이 올바르지 않습니다." };
  const userCodeHash = hashPairingCode(parsed.data);

  const row = await prisma.devAgentPairingRequest.findUnique({ where: { userCodeHash } });
  if (!row || row.status !== "PENDING" || row.expiresAt.getTime() < Date.now()) {
    return { error: "코드가 만료되었거나 유효하지 않습니다.", code: "NOT_FOUND" };
  }

  const secret = generateDeviceSecret();
  const device = await prisma.devAgentDevice.create({
    data: {
      userId: user.id,
      name: row.deviceName?.trim() || "My Computer",
      platform: row.platform,
      secretHash: hashDeviceSecret(secret),
    },
  });
  await prisma.devAgentPairingRequest.update({
    where: { id: row.id },
    data: { status: "APPROVED", userId: user.id, deviceId: device.id, deviceSecretPlain: secret },
  });

  revalidatePath("/dev");
  revalidatePath("/dev/settings");
  return {};
}

export async function denyPairing(rawCode: string): Promise<DevActionError> {
  await requireCurrentUser();
  const parsed = pairingCodeSchema.safeParse(rawCode);
  if (!parsed.success) return { error: "코드 형식이 올바르지 않습니다." };

  await prisma.devAgentPairingRequest.updateMany({
    where: { userCodeHash: hashPairingCode(parsed.data), status: "PENDING" },
    data: { status: "DENIED" },
  });
  return {};
}

// ── Device management ──────────────────────────────────────────────────

export async function getMyDevices(): Promise<{ devices: DeviceSummary[] } & DevActionError> {
  const user = await requireCurrentUser();
  return { devices: await listMyDevices(user.id) };
}

export async function renameDevice(deviceId: string, rawName: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const parsed = deviceNameSchema.safeParse(rawName);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "이름이 올바르지 않습니다." };

  const result = await prisma.devAgentDevice.updateMany({
    where: { id: deviceId, userId: user.id },
    data: { name: parsed.data },
  });
  if (result.count === 0) return { error: "기기를 찾을 수 없습니다.", code: "NOT_FOUND" };
  revalidatePath("/dev/settings");
  return {};
}

/** Revoking only stops future sessions/heartbeats from being accepted — it
 * does not (and cannot) reach into the agent process itself; the agent keeps
 * running locally until the user also disconnects it there (§28 note in
 * SECURITY.md: revoke is a server-side kill switch for the trust relationship,
 * not a remote-shutdown command). */
export async function revokeDevice(deviceId: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const result = await prisma.devAgentDevice.updateMany({
    where: { id: deviceId, userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return { error: "기기를 찾을 수 없습니다.", code: "NOT_FOUND" };
  revalidatePath("/dev");
  revalidatePath("/dev/settings");
  return {};
}

/** Explicit grant/revoke of one sensitive permission (§21) — read scopes are
 * rejected here since they're never gated by a grant row in the first place. */
export async function setPermissionGrant(
  deviceId: string,
  rawPermission: string,
  granted: boolean,
): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const parsedPermission = permissionSchema.safeParse(rawPermission);
  if (!parsedPermission.success) return { error: "알 수 없는 권한입니다." };
  const permission = parsedPermission.data;
  if (isReadPermission(permission)) return { error: "읽기 권한은 항상 허용됩니다." };

  const device = await getMyDevice(user.id, deviceId);
  if (!device) return { error: "기기를 찾을 수 없습니다.", code: "NOT_FOUND" };

  if (granted) {
    await prisma.devAgentPermissionGrant.upsert({
      where: { deviceId_permission: { deviceId, permission } },
      create: { deviceId, permission },
      update: { revokedAt: null, grantedAt: new Date() },
    });
  } else {
    await prisma.devAgentPermissionGrant.updateMany({
      where: { deviceId, permission, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  revalidatePath("/dev/settings");
  return {};
}

// ── Agent connect sessions (§17-equivalent) ────────────────────────────

export type AgentConnectInfo = {
  deviceId: string;
  agentUrl: string;
  sessionToken: string;
} & DevActionError;

/** Mints the opaque, single-use token the BROWSER hands directly to the
 * Local Agent (same machine, over 127.0.0.1) to open one file/terminal/git
 * connection. The agent independently redeems it via agent/verify-session —
 * this action never talks to the agent itself (§3: StudyOS Web never reaches
 * into the user's machine). */
export async function createAgentSession(deviceId: string, rawScope: string): Promise<AgentConnectInfo> {
  const user = await requireCurrentUser();
  const blocked = await requireDevEntitlement(user);
  if (blocked) return { deviceId: "", agentUrl: "", sessionToken: "", ...blocked };

  const parsedScope = permissionSchema.safeParse(rawScope);
  if (!parsedScope.success) return { deviceId: "", agentUrl: "", sessionToken: "", error: "알 수 없는 권한입니다." };
  const scope = parsedScope.data;

  const device = await getMyDevice(user.id, deviceId);
  if (!device) return { deviceId: "", agentUrl: "", sessionToken: "", error: "기기를 찾을 수 없습니다.", code: "NOT_FOUND" };
  if (!device.localPort) {
    return { deviceId: "", agentUrl: "", sessionToken: "", error: "Local Agent가 연결되어 있지 않습니다.", code: "NOT_FOUND" };
  }

  if (!isReadPermission(scope)) {
    const grant = await prisma.devAgentPermissionGrant.findUnique({
      where: { deviceId_permission: { deviceId, permission: scope } },
    });
    if (!grant || grant.revokedAt) {
      return {
        deviceId: "",
        agentUrl: "",
        sessionToken: "",
        error: `이 작업에는 "${scope}" 권한이 필요합니다. 설정에서 허용해주세요.`,
        code: "PERMISSION_DENIED",
      };
    }
  }

  // The session token IS the row's own unguessable cuid — the agent redeems
  // it by id via agent/verify-session, so no separate opaque token/lookup key
  // is needed.
  const session = await prisma.devAgentSession.create({
    data: {
      deviceId,
      userId: user.id,
      scope,
      expiresAt: new Date(Date.now() + AGENT_SESSION_TTL_MS),
    },
    select: { id: true },
  });

  return {
    deviceId,
    agentUrl: `http://127.0.0.1:${device.localPort}`,
    sessionToken: session.id,
  };
}

export type { DevPermission };
