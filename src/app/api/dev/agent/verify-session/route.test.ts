import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { devAgentSession, devAgentPermissionGrant } = vi.hoisted(() => ({
  devAgentSession: { findUnique: vi.fn(), update: vi.fn() },
  devAgentPermissionGrant: { findUnique: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { devAgentSession, devAgentPermissionGrant } }));

const { requireDeviceAuth } = vi.hoisted(() => ({ requireDeviceAuth: vi.fn() }));
vi.mock("@/features/dev/agent-server-auth", () => ({ requireDeviceAuth }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/dev/agent/verify-session";

function req(sessionToken: string) {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer device-secret" },
    body: JSON.stringify({ sessionToken }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireDeviceAuth.mockResolvedValue({ id: "device-1" });
  devAgentSession.update.mockResolvedValue({});
});

describe("POST /api/dev/agent/verify-session (§14/§21 — the one place a browser token is validated)", () => {
  it("401s when the device credential doesn't verify", async () => {
    requireDeviceAuth.mockResolvedValue(null);
    devAgentSession.findUnique.mockResolvedValue({});
    const res = await POST(req("sess-1"));
    expect(res.status).toBe(401);
  });

  it("rejects an unknown session token", async () => {
    devAgentSession.findUnique.mockResolvedValue(null);
    const res = await POST(req("sess-1"));
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });

  it("rejects a session that belongs to a DIFFERENT device", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "someone-elses-device",
      scope: "dev.workspace.read",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await POST(req("sess-1"));
    expect(res.status).toBe(401);
  });

  it("rejects an already-consumed (single-use) session", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "device-1",
      scope: "dev.workspace.read",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await POST(req("sess-1"));
    expect(res.status).toBe(401);
  });

  it("rejects an expired session", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "device-1",
      scope: "dev.workspace.read",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await POST(req("sess-1"));
    expect(res.status).toBe(401);
  });

  it("accepts and consumes a valid read-scope session with no grant row needed", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "device-1",
      userId: "user-1",
      scope: "dev.workspace.read",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await POST(req("sess-1"));
    const body = await res.json();

    expect(body).toEqual({ ok: true, userId: "user-1", scope: "dev.workspace.read" });
    expect(devAgentSession.update).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { consumedAt: expect.any(Date) },
    });
    expect(devAgentPermissionGrant.findUnique).not.toHaveBeenCalled();
  });

  it("re-checks the grant server-side for a write scope and rejects if revoked (§21 defense-in-depth)", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "device-1",
      userId: "user-1",
      scope: "dev.terminal.execute",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    devAgentPermissionGrant.findUnique.mockResolvedValue({ revokedAt: new Date() });

    const res = await POST(req("sess-1"));
    expect(res.status).toBe(403);
    expect(devAgentSession.update).not.toHaveBeenCalled();
  });

  it("accepts a write scope that IS currently granted", async () => {
    devAgentSession.findUnique.mockResolvedValue({
      id: "sess-1",
      deviceId: "device-1",
      userId: "user-1",
      scope: "dev.terminal.execute",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    devAgentPermissionGrant.findUnique.mockResolvedValue({ revokedAt: null });

    const res = await POST(req("sess-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
