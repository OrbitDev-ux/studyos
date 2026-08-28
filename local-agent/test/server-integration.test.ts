import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { Server } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const { verifySession } = vi.hoisted(() => ({ verifySession: vi.fn() }));
vi.mock("../src/web-client.js", () => ({ verifySession, heartbeat: vi.fn() }));

import { createAgentServer } from "../src/server.js";
import { addWorkspace } from "../src/local-config.js";

const ORIGIN = "https://studyos.app";

describe("agent HTTP server — end-to-end wiring (§14/§17/§23)", () => {
  let server: Server;
  let baseUrl: string;
  let workspaceRoot: string;
  let workspaceId: string;

  beforeAll(async () => {
    workspaceRoot = await mkdtemp(path.join(tmpdir(), "studyos-dev-server-"));
    const workspace = await addWorkspace(workspaceRoot, "Integration");
    workspaceId = workspace.id;

    const { server: s } = createAgentServer(async () => "fake-device-secret");
    server = s;
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "string" || address === null) throw new Error("expected AddressInfo");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it("GET /health requires no session and no origin", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("rejects a request from a non-allow-listed origin before touching auth", async () => {
    const res = await fetch(`${baseUrl}/fs/${workspaceId}/list?path=`, {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.status).toBe(403);
    verifySession.mockClear();
    expect(verifySession).not.toHaveBeenCalled();
  });

  it("rejects a missing/invalid session token", async () => {
    verifySession.mockResolvedValue({ ok: false });
    const res = await fetch(`${baseUrl}/fs/${workspaceId}/list?path=`, {
      headers: { Origin: ORIGIN },
    });
    expect(res.status).toBe(401);
  });

  it("full write → list → read → delete round trip through real HTTP with a verified session", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.write" });
    const write = await fetch(`${baseUrl}/fs/${workspaceId}/file`, {
      method: "PUT",
      headers: { Origin: ORIGIN, "Content-Type": "application/json", "X-StudyOS-Session": "tok-write" },
      body: JSON.stringify({ path: "hello.txt", content: "hi from integration test" }),
    });
    expect(write.status).toBe(200);

    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const list = await fetch(`${baseUrl}/fs/${workspaceId}/list?path=`, {
      headers: { Origin: ORIGIN, "X-StudyOS-Session": "tok-read" },
    });
    const listBody = await list.json();
    expect(listBody.entries.some((e: { name: string }) => e.name === "hello.txt")).toBe(true);

    const read = await fetch(`${baseUrl}/fs/${workspaceId}/file?path=hello.txt`, {
      headers: { Origin: ORIGIN, "X-StudyOS-Session": "tok-read" },
    });
    expect((await read.json()).content).toBe("hi from integration test");

    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.write" });
    const del = await fetch(`${baseUrl}/fs/${workspaceId}/entry?path=hello.txt`, {
      method: "DELETE",
      headers: { Origin: ORIGIN, "X-StudyOS-Session": "tok-write" },
    });
    expect(del.status).toBe(200);
  });

  it("a read-scoped session cannot perform a write (scope enforcement, §21)", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const res = await fetch(`${baseUrl}/fs/${workspaceId}/file`, {
      method: "PUT",
      headers: { Origin: ORIGIN, "Content-Type": "application/json", "X-StudyOS-Session": "tok-read-only" },
      body: JSON.stringify({ path: "nope.txt", content: "should be rejected" }),
    });
    expect(res.status).toBe(401);
  });

  it("git status on a non-repo workspace responds cleanly over real HTTP", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.git.read" });
    const res = await fetch(`${baseUrl}/git/${workspaceId}/status`, {
      headers: { Origin: ORIGIN, "X-StudyOS-Session": "tok-git" },
    });
    const body = await res.json();
    expect(body.isRepo).toBe(false);
  });

  it("404s a workspace id that doesn't exist locally", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const res = await fetch(`${baseUrl}/fs/does-not-exist/list?path=`, {
      headers: { Origin: ORIGIN, "X-StudyOS-Session": "tok-any" },
    });
    expect(res.status).toBe(404);
  });
});
