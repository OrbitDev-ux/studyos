import { describe, expect, it, vi, beforeEach } from "vitest";

const { verifySession } = vi.hoisted(() => ({ verifySession: vi.fn() }));
vi.mock("../src/web-client.js", () => ({ verifySession }));

import { SessionAuthenticator } from "../src/session-auth.js";

describe("SessionAuthenticator (§14/§21)", () => {
  beforeEach(() => {
    verifySession.mockReset();
  });

  it("returns null when no session token is presented", async () => {
    const auth = new SessionAuthenticator(async () => "secret");
    expect(await auth.verify(undefined)).toBeNull();
    expect(verifySession).not.toHaveBeenCalled();
  });

  it("returns null when there is no stored device credential yet", async () => {
    const auth = new SessionAuthenticator(async () => null);
    expect(await auth.verify("tok")).toBeNull();
    expect(verifySession).not.toHaveBeenCalled();
  });

  it("verifies with StudyOS Web and returns the scope/userId on success", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const auth = new SessionAuthenticator(async () => "secret");
    const result = await auth.verify("tok");
    expect(result).toEqual(expect.objectContaining({ userId: "u1", scope: "dev.workspace.read" }));
  });

  it("returns null when StudyOS Web rejects the token", async () => {
    verifySession.mockResolvedValue({ ok: false });
    const auth = new SessionAuthenticator(async () => "secret");
    expect(await auth.verify("tok")).toBeNull();
  });

  it("caches a verified session — a second call with the same token doesn't re-hit the network", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.terminal.execute" });
    const auth = new SessionAuthenticator(async () => "secret");
    await auth.verify("tok");
    await auth.verify("tok");
    expect(verifySession).toHaveBeenCalledTimes(1);
  });

  it("requireScope rejects a session verified for a different scope", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const auth = new SessionAuthenticator(async () => "secret");
    expect(await auth.requireScope("tok", "dev.workspace.write")).toBeNull();
  });

  it("requireScope accepts a session verified for the exact requested scope", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.write" });
    const auth = new SessionAuthenticator(async () => "secret");
    expect(await auth.requireScope("tok", "dev.workspace.write")).not.toBeNull();
  });

  it("different tokens are verified independently", async () => {
    verifySession.mockResolvedValue({ ok: true, userId: "u1", scope: "dev.workspace.read" });
    const auth = new SessionAuthenticator(async () => "secret");
    await auth.verify("tok-a");
    await auth.verify("tok-b");
    expect(verifySession).toHaveBeenCalledTimes(2);
  });
});
