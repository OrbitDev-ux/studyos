import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { devAgentDevice, devAgentPairingRequest, devAgentPermissionGrant, devAgentSession } = vi.hoisted(() => ({
  devAgentDevice: { create: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  devAgentPairingRequest: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  devAgentPermissionGrant: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  devAgentSession: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    devAgentDevice,
    devAgentPairingRequest,
    devAgentPermissionGrant,
    devAgentSession,
  },
}));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

vi.mock("@/features/billing/access", () => ({ accessStateFor: vi.fn(() => "PRO") }));
vi.mock("@/features/billing/entitlements", () => ({ canUseFeature: vi.fn(() => true) }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { approvePairing, createAgentSession, setPermissionGrant } from "@/features/dev/agent-actions";
import { hashPairingCode } from "@/features/dev/agent-crypto";
import { canUseFeature } from "@/features/billing/entitlements";

const USER = { id: "user-1", email: "student@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("approvePairing (§5/§6)", () => {
  it("creates the device only for a PENDING, unexpired request matching the code", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      deviceName: "MacBook",
      platform: "darwin",
    });
    devAgentDevice.create.mockResolvedValue({ id: "device-1" });
    devAgentPairingRequest.update.mockResolvedValue({});

    const result = await approvePairing("WXPK-7RTN");

    expect(result.error).toBeUndefined();
    expect(devAgentPairingRequest.findUnique).toHaveBeenCalledWith({
      where: { userCodeHash: hashPairingCode("WXPK-7RTN") },
    });
    expect(devAgentDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", name: "MacBook" }) }),
    );
    // The device's secretHash is stored, never the raw secret.
    const created = devAgentDevice.create.mock.calls[0]![0].data;
    expect(created.secretHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created).not.toHaveProperty("secret");

    // The pairing row is updated with the RAW secret transiently (read-once
    // by the agent's poll — see the pairing/poll route), and links this user.
    expect(devAgentPairingRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "req-1" },
        data: expect.objectContaining({ status: "APPROVED", userId: "user-1", deviceId: "device-1" }),
      }),
    );
  });

  it("refuses an already-approved (reused) code", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await approvePairing("WXPK-7RTN");

    expect(result.code).toBe("NOT_FOUND");
    expect(devAgentDevice.create).not.toHaveBeenCalled();
  });

  it("refuses an expired code", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await approvePairing("WXPK-7RTN");

    expect(result.code).toBe("NOT_FOUND");
    expect(devAgentDevice.create).not.toHaveBeenCalled();
  });

  it("blocks pairing when the user's plan doesn't include DEV_WORKSPACE", async () => {
    vi.mocked(canUseFeature).mockReturnValueOnce(false);
    const result = await approvePairing("WXPK-7RTN");
    expect(result.code).toBe("ENTITLEMENT_BLOCKED");
    expect(devAgentPairingRequest.findUnique).not.toHaveBeenCalled();
  });
});

describe("setPermissionGrant (§21 — default deny)", () => {
  it("rejects granting a read-scope permission — those are never gate-able", async () => {
    devAgentDevice.findMany.mockResolvedValue([]);
    const result = await setPermissionGrant("device-1", "dev.workspace.read", true);
    expect(result.error).toBeDefined();
    expect(devAgentPermissionGrant.upsert).not.toHaveBeenCalled();
  });

  it("404s on a device the caller doesn't own", async () => {
    // getMyDevice does a scoped findFirst; simulate "not found" via the mock.
    devAgentDevice.findFirst.mockResolvedValue(null);

    const result = await setPermissionGrant("someone-elses-device", "dev.terminal.execute", true);
    expect(result.code).toBe("NOT_FOUND");
  });

  it("granting upserts a non-revoked row; revoking sets revokedAt", async () => {
    devAgentDevice.findFirst.mockResolvedValue({ id: "device-1" });

    await setPermissionGrant("device-1", "dev.terminal.execute", true);
    expect(devAgentPermissionGrant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId_permission: { deviceId: "device-1", permission: "dev.terminal.execute" } },
      }),
    );

    await setPermissionGrant("device-1", "dev.terminal.execute", false);
    expect(devAgentPermissionGrant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: "device-1", permission: "dev.terminal.execute", revokedAt: null },
      }),
    );
  });
});

describe("createAgentSession (§17 — permission-gated connect token)", () => {
  it("denies a grantable scope with no grant row", async () => {
    devAgentDevice.findFirst.mockResolvedValue({ id: "device-1", localPort: 4739 });
    devAgentPermissionGrant.findUnique.mockResolvedValue(null);

    const result = await createAgentSession("device-1", "dev.terminal.execute");
    expect(result.code).toBe("PERMISSION_DENIED");
    expect(devAgentSession.create).not.toHaveBeenCalled();
  });

  it("denies a scope whose grant was revoked", async () => {
    devAgentDevice.findFirst.mockResolvedValue({ id: "device-1", localPort: 4739 });
    devAgentPermissionGrant.findUnique.mockResolvedValue({ revokedAt: new Date() });

    const result = await createAgentSession("device-1", "dev.terminal.execute");
    expect(result.code).toBe("PERMISSION_DENIED");
  });

  it("always allows a read scope with no grant row needed", async () => {
    devAgentDevice.findFirst.mockResolvedValue({ id: "device-1", localPort: 4739 });
    devAgentSession.create.mockResolvedValue({ id: "sess-1" });

    const result = await createAgentSession("device-1", "dev.workspace.read");
    expect(result.error).toBeUndefined();
    expect(result.sessionToken).toBe("sess-1");
    expect(result.agentUrl).toBe("http://127.0.0.1:4739");
    expect(devAgentPermissionGrant.findUnique).not.toHaveBeenCalled();
  });

  it("refuses to mint a session when the device has no known local port (agent never connected)", async () => {
    devAgentDevice.findFirst.mockResolvedValue({ id: "device-1", localPort: null });

    const result = await createAgentSession("device-1", "dev.workspace.read");
    expect(result.error).toBeDefined();
    expect(devAgentSession.create).not.toHaveBeenCalled();
  });
});
