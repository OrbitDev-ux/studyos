import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { devAgentPairingRequest } = vi.hoisted(() => ({
  devAgentPairingRequest: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { devAgentPairingRequest } }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/dev/pairing/poll";

function req(pairingRequestId: string) {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pairingRequestId }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  devAgentPairingRequest.update.mockResolvedValue({});
});

describe("POST /api/dev/pairing/poll (§5/§6 — read-once secret handoff)", () => {
  it("reports EXPIRED for an unknown pairing request id", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue(null);
    const res = await POST(req("nonexistent"));
    expect((await res.json()).status).toBe("EXPIRED");
  });

  it("reports PENDING while unapproved, and increments the attempt counter", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      deviceId: null,
      deviceSecretPlain: null,
    });
    const res = await POST(req("req-1"));
    expect((await res.json()).status).toBe("PENDING");
    expect(devAgentPairingRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
  });

  it("delivers the raw device secret exactly once on APPROVED, then clears it", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      deviceId: "device-1",
      deviceSecretPlain: "raw-secret-value",
    });

    const res = await POST(req("req-1"));
    const body = await res.json();

    expect(body).toEqual({ status: "APPROVED", deviceId: "device-1", deviceSecret: "raw-secret-value" });
    expect(devAgentPairingRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { deviceSecretPlain: null },
    });
  });

  it("a second poll after delivery (secret already cleared) reports EXPIRED, not the secret again", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "APPROVED",
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      deviceId: "device-1",
      deviceSecretPlain: null, // already delivered and cleared
    });

    const res = await POST(req("req-1"));
    const body = await res.json();
    expect(body).toEqual({ status: "EXPIRED" });
  });

  it("reports EXPIRED and stops accepting once the attempt cap is hit (brute-force guard)", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 999,
      deviceId: null,
      deviceSecretPlain: null,
    });
    const res = await POST(req("req-1"));
    expect((await res.json()).status).toBe("EXPIRED");
    expect(devAgentPairingRequest.update).not.toHaveBeenCalled();
  });

  it("reports EXPIRED for a PENDING row past its expiry and marks it expired", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "PENDING",
      expiresAt: new Date(Date.now() - 1000),
      attempts: 0,
      deviceId: null,
      deviceSecretPlain: null,
    });
    const res = await POST(req("req-1"));
    expect((await res.json()).status).toBe("EXPIRED");
    expect(devAgentPairingRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "EXPIRED" },
    });
  });

  it("reports DENIED as-is", async () => {
    devAgentPairingRequest.findUnique.mockResolvedValue({
      id: "req-1",
      status: "DENIED",
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      deviceId: null,
      deviceSecretPlain: null,
    });
    const res = await POST(req("req-1"));
    expect((await res.json()).status).toBe("DENIED");
  });
});
