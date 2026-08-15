import { describe, expect, it } from "vitest";
import { signCapabilityToken } from "@/features/dev/runtime-token-core";

describe("signCapabilityToken (§13/§25 capability tokens)", () => {
  it("returns null when no secret is configured — honest v1 default", () => {
    expect(signCapabilityToken("user1", "ws1", "terminal", 60, undefined)).toBeNull();
  });

  it("mints a well-formed payload.sig token when a secret is given", () => {
    const token = signCapabilityToken("user1", "ws1", "terminal", 60, "test-secret");
    expect(token).not.toBeNull();
    const parts = (token as string).split(".");
    expect(parts).toHaveLength(2);

    const [payloadB64] = parts;
    const payload = JSON.parse(Buffer.from(payloadB64 as string, "base64url").toString("utf8")) as {
      sub: string;
      wsid: string;
      scope: string;
      exp: number;
    };
    expect(payload.sub).toBe("user1");
    expect(payload.wsid).toBe("ws1");
    expect(payload.scope).toBe("terminal");
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("encodes the requested scope and ttl into the expiry", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signCapabilityToken("user1", "ws1", "preview", 120, "test-secret") as string;
    const payload = JSON.parse(
      Buffer.from(token.split(".")[0] as string, "base64url").toString("utf8"),
    ) as { scope: string; exp: number };
    expect(payload.scope).toBe("preview");
    expect(payload.exp).toBeGreaterThanOrEqual(before + 120);
    expect(payload.exp).toBeLessThanOrEqual(before + 121);
  });

  it("produces different signatures for different secrets (no cross-secret forgery)", () => {
    const tokenA = signCapabilityToken("user1", "ws1", "terminal", 60, "secret-a") as string;
    const tokenB = signCapabilityToken("user1", "ws1", "terminal", 60, "secret-b") as string;
    // Payloads may collide in timing but signatures must differ across secrets.
    expect(tokenA.split(".")[1]).not.toBe(tokenB.split(".")[1]);
  });
});
