import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemoteContainerManager } from "@/features/dev/remote-container-manager";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RemoteContainerManager (§5/§6 ContainerManager over HTTP)", () => {
  const manager = new RemoteContainerManager();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("DEV_RUNTIME_URL", "https://runtime.example.com");
    vi.stubEnv("DEV_RUNTIME_SERVICE_TOKEN", "test-service-token");
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("ensureContainer POSTs to /containers/:id/ensure and maps a successful response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "RUNNING", containerId: "abc123" }),
    );

    const result = await manager.ensureContainer("ws1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://runtime.example.com/containers/ws1/ensure");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-service-token");
    expect(result).toEqual({ ok: true, status: "RUNNING", containerId: "abc123" });
  });

  it("start POSTs to /containers/:id/start", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "RUNNING" }));
    const result = await manager.start("ws1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://runtime.example.com/containers/ws1/start");
    expect(init.method).toBe("POST");
    expect(result).toEqual({ ok: true, status: "RUNNING" });
  });

  it("stop POSTs to /containers/:id/stop", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "STOPPED" }));
    const result = await manager.stop("ws1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://runtime.example.com/containers/ws1/stop");
    expect(init.method).toBe("POST");
    expect(result).toEqual({ ok: true, status: "STOPPED" });
  });

  it("restart POSTs to /containers/:id/restart", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: "RUNNING" }));
    const result = await manager.restart("ws1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://runtime.example.com/containers/ws1/restart");
    expect(init.method).toBe("POST");
    expect(result).toEqual({ ok: true, status: "RUNNING" });
  });

  it("destroy DELETEs /containers/:id and reports STOPPED on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const result = await manager.destroy("ws1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://runtime.example.com/containers/ws1");
    expect(init.method).toBe("DELETE");
    expect(result).toEqual({ ok: true, status: "STOPPED" });
  });

  it("maps a non-ok HTTP response to BACKEND_UNAVAILABLE, not a thrown error", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: { message: "container crashed" } }));
    const result = await manager.ensureContainer("ws1");
    expect(result).toEqual({ ok: false, code: "BACKEND_UNAVAILABLE", message: "container crashed" });
  });

  it("maps a network failure (fetch throws) to BACKEND_UNAVAILABLE", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const result = await manager.start("ws1");
    expect(result).toEqual({
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: "Could not reach the dev runtime backend.",
    });
  });
});
