import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { devAgentDevice, devAgentPermissionGrant } = vi.hoisted(() => ({
  devAgentDevice: { update: vi.fn() },
  devAgentPermissionGrant: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { devAgentDevice, devAgentPermissionGrant } }));

const { requireDeviceAuth } = vi.hoisted(() => ({ requireDeviceAuth: vi.fn() }));
vi.mock("@/features/dev/agent-server-auth", () => ({ requireDeviceAuth }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/dev/agent/heartbeat";

function req(body: unknown, secret = "device-secret") {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  devAgentPermissionGrant.findMany.mockResolvedValue([]);
  devAgentDevice.update.mockResolvedValue({});
});

describe("POST /api/dev/agent/heartbeat", () => {
  it("401s when the device credential doesn't verify", async () => {
    requireDeviceAuth.mockResolvedValue(null);
    const res = await POST(req({ localPort: 4739 }));
    expect(res.status).toBe(401);
    expect(devAgentDevice.update).not.toHaveBeenCalled();
  });

  it("updates lastSeenAt and the self-reported local port", async () => {
    requireDeviceAuth.mockResolvedValue({ id: "device-1" });
    await POST(req({ localPort: 4739 }));
    expect(devAgentDevice.update).toHaveBeenCalledWith({
      where: { id: "device-1" },
      data: { lastSeenAt: expect.any(Date), localPort: 4739 },
    });
  });

  it("rejects an invalid port", async () => {
    requireDeviceAuth.mockResolvedValue({ id: "device-1" });
    const res = await POST(req({ localPort: 99999 }));
    expect(res.status).toBe(400);
    expect(devAgentDevice.update).not.toHaveBeenCalled();
  });

  it("returns the device's current grant state, scoped to that device only", async () => {
    requireDeviceAuth.mockResolvedValue({ id: "device-1" });
    devAgentPermissionGrant.findMany.mockResolvedValue([{ permission: "dev.terminal.execute" }]);

    const res = await POST(req({ localPort: 4739 }));
    const body = await res.json();

    expect(devAgentPermissionGrant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deviceId: "device-1", revokedAt: null } }),
    );
    expect(body.permissions["dev.terminal.execute"]).toBe(true);
    expect(body.permissions["dev.workspace.write"]).toBe(false);
  });
});
