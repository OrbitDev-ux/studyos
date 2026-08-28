import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { devAgentPairingRequest } = vi.hoisted(() => ({
  devAgentPairingRequest: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { devAgentPairingRequest } }));

import { POST } from "./route";

const URL = "https://studyos.example.com/api/dev/pairing/start";

function req(body: unknown, ip = "1.2.3.4") {
  return new NextRequest(URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  devAgentPairingRequest.count.mockResolvedValue(0);
  devAgentPairingRequest.findUnique.mockResolvedValue(null); // no code collision
  devAgentPairingRequest.create.mockResolvedValue({ id: "req-1" });
});

describe("POST /api/dev/pairing/start (§5 — the one no-auth endpoint)", () => {
  it("creates a pairing request and returns a code — never the hash, never a device secret", async () => {
    const res = await POST(req({ deviceName: "MacBook", platform: "darwin" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pairingRequestId).toBe("req-1");
    expect(body.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(body).not.toHaveProperty("userCodeHash");
    expect(body).not.toHaveProperty("deviceSecret");
  });

  it("stores only the HASH of the code, never the plaintext (§5)", async () => {
    await POST(req({ deviceName: "MacBook", platform: "darwin" }));
    const created = devAgentPairingRequest.create.mock.calls[0]![0].data;
    expect(created.userCodeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(created).not.toHaveProperty("userCode");
  });

  it("stores the requesting IP for rate-limiting, scoped to this row", async () => {
    await POST(req({ deviceName: "MacBook", platform: "darwin" }, "9.9.9.9"));
    const created = devAgentPairingRequest.create.mock.calls[0]![0].data;
    expect(created.requestIp).toBe("9.9.9.9");
  });

  it("rate-limits by IP once the per-window cap is hit", async () => {
    devAgentPairingRequest.count.mockResolvedValue(999);
    const res = await POST(req({ deviceName: "MacBook", platform: "darwin" }));
    expect(res.status).toBe(429);
    expect(devAgentPairingRequest.create).not.toHaveBeenCalled();
  });

  it("rejects a malformed body", async () => {
    const res = await POST(req({ deviceName: 12345 }));
    expect(res.status).toBe(400);
    expect(devAgentPairingRequest.create).not.toHaveBeenCalled();
  });

  it("regenerates the code on a hash collision instead of failing the request", async () => {
    devAgentPairingRequest.findUnique
      .mockResolvedValueOnce({ id: "existing" }) // first generated code collides
      .mockResolvedValueOnce(null); // second attempt is free

    const res = await POST(req({ deviceName: "MacBook", platform: "darwin" }));
    expect(res.status).toBe(200);
    expect(devAgentPairingRequest.findUnique).toHaveBeenCalledTimes(2);
  });
});
