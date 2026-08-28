import { describe, expect, it } from "vitest";
import {
  generatePairingCode,
  normalizePairingCode,
  hashPairingCode,
  generateDeviceSecret,
  hashDeviceSecret,
  generateSessionToken,
  parseDeviceBearer,
} from "@/features/dev/agent-crypto";

describe("generatePairingCode (§5)", () => {
  it("produces an 8-character code with unambiguous glyphs, grouped with a dash", () => {
    for (let i = 0; i < 50; i++) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(code).not.toMatch(/[0O1IL]/); // ambiguous characters excluded
    }
  });

  it("is high-entropy — 50 draws never collide", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generatePairingCode()));
    expect(codes.size).toBe(50);
  });
});

describe("normalizePairingCode / hashPairingCode", () => {
  it("normalizes case, dashes, and surrounding whitespace identically", () => {
    expect(normalizePairingCode(" wxpk-7rtn ")).toBe("WXPK7RTN");
    expect(normalizePairingCode("WXPK-7RTN")).toBe("WXPK7RTN");
    expect(normalizePairingCode("wxpk7rtn")).toBe("WXPK7RTN");
  });

  it("hashes to the same value regardless of formatting differences a human might type", () => {
    expect(hashPairingCode("WXPK-7RTN")).toBe(hashPairingCode("wxpk7rtn"));
    expect(hashPairingCode("WXPK-7RTN")).toBe(hashPairingCode(" WXPK-7RTN "));
  });

  it("never stores/returns the raw code — hash is a 64-char hex digest", () => {
    expect(hashPairingCode("WXPK-7RTN")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different codes hash differently", () => {
    expect(hashPairingCode("AAAA-1111")).not.toBe(hashPairingCode("BBBB-2222"));
  });
});

describe("generateDeviceSecret / hashDeviceSecret (§6)", () => {
  it("produces a high-entropy, URL-safe secret", () => {
    const secret = generateDeviceSecret();
    expect(secret.length).toBeGreaterThan(30);
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("two secrets are never equal", () => {
    expect(generateDeviceSecret()).not.toBe(generateDeviceSecret());
  });

  it("hash is deterministic for the same secret", () => {
    const secret = generateDeviceSecret();
    expect(hashDeviceSecret(secret)).toBe(hashDeviceSecret(secret));
  });
});

describe("generateSessionToken", () => {
  it("produces a high-entropy token distinct across calls", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
});

describe("parseDeviceBearer", () => {
  it("extracts the secret from a well-formed Authorization header", () => {
    expect(parseDeviceBearer("Bearer abc123")).toBe("abc123");
  });

  it("returns null for a missing or malformed header", () => {
    expect(parseDeviceBearer(undefined)).toBeNull();
    expect(parseDeviceBearer(null)).toBeNull();
    expect(parseDeviceBearer("")).toBeNull();
    expect(parseDeviceBearer("Basic abc123")).toBeNull();
    expect(parseDeviceBearer("Bearer ")).toBeNull();
  });
});
