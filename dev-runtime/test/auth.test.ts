import { describe, expect, it } from "vitest";
import { signCapabilityToken, verifyCapabilityToken, verifyServiceToken } from "../src/auth.js";

const SECRET = "test-capability-secret";

describe("capability token (terminal/preview auth, §17)", () => {
  it("round-trips a valid token", () => {
    const token = signCapabilityToken({ sub: "user1", wsid: "ws1", scope: "terminal", ttlSeconds: 60 }, SECRET);
    const payload = verifyCapabilityToken(token, SECRET, "terminal");
    expect(payload).toEqual({ sub: "user1", wsid: "ws1", scope: "terminal", exp: expect.any(Number) });
  });

  it("rejects a token signed with a different secret", () => {
    const token = signCapabilityToken({ sub: "user1", wsid: "ws1", scope: "terminal", ttlSeconds: 60 }, SECRET);
    expect(verifyCapabilityToken(token, "wrong-secret", "terminal")).toBeNull();
  });

  it("rejects a tampered payload (workspaceId swapped)", () => {
    const token = signCapabilityToken({ sub: "user1", wsid: "ws1", scope: "terminal", ttlSeconds: 60 }, SECRET);
    const [payloadB64, sig] = token.split(".");
    const tampered = JSON.parse(Buffer.from(payloadB64!, "base64url").toString("utf8"));
    tampered.wsid = "someone-elses-workspace";
    const forgedPayload = Buffer.from(JSON.stringify(tampered)).toString("base64url");
    expect(verifyCapabilityToken(`${forgedPayload}.${sig}`, SECRET, "terminal")).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signCapabilityToken({ sub: "user1", wsid: "ws1", scope: "terminal", ttlSeconds: -10 }, SECRET);
    expect(verifyCapabilityToken(token, SECRET, "terminal")).toBeNull();
  });

  it("rejects the wrong scope (a terminal token can't open a preview)", () => {
    const token = signCapabilityToken({ sub: "user1", wsid: "ws1", scope: "terminal", ttlSeconds: 60 }, SECRET);
    expect(verifyCapabilityToken(token, SECRET, "preview")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyCapabilityToken("", SECRET, "terminal")).toBeNull();
    expect(verifyCapabilityToken("not-a-token", SECRET, "terminal")).toBeNull();
    expect(verifyCapabilityToken("a.b.c", SECRET, "terminal")).toBeNull();
  });
});

describe("service token (Web→Runtime server-to-server auth, §4)", () => {
  it("accepts the exact configured token", () => {
    expect(verifyServiceToken("Bearer abc123", "abc123")).toBe(true);
  });

  it("rejects a missing/malformed header", () => {
    expect(verifyServiceToken(undefined, "abc123")).toBe(false);
    expect(verifyServiceToken("abc123", "abc123")).toBe(false); // missing "Bearer " prefix
  });

  it("rejects a wrong token", () => {
    expect(verifyServiceToken("Bearer wrong", "abc123")).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    expect(verifyServiceToken("Bearer anything", "")).toBe(false);
  });
});
