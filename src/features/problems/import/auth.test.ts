import { describe, expect, it } from "vitest";
import {
  authorizeImport,
  parseBearerToken,
  tokensMatch,
} from "@/features/problems/import/auth";

describe("parseBearerToken", () => {
  it("extracts and trims the token after 'Bearer '", () => {
    expect(parseBearerToken("Bearer abc123")).toBe("abc123");
    expect(parseBearerToken("Bearer   abc123  ")).toBe("abc123");
  });
  it("returns empty for missing / malformed headers (case-sensitive scheme)", () => {
    expect(parseBearerToken(null)).toBe("");
    expect(parseBearerToken("")).toBe("");
    expect(parseBearerToken("bearer abc")).toBe(""); // lowercase scheme not accepted
    expect(parseBearerToken("Token abc")).toBe("");
  });
});

describe("tokensMatch", () => {
  it("is true only for identical values", () => {
    expect(tokensMatch("secret", "secret")).toBe(true);
    expect(tokensMatch("secret", "secreT")).toBe(false);
    expect(tokensMatch("secret", "secret ")).toBe(false); // length differs
  });
});

describe("authorizeImport", () => {
  it("accepts a matching Bearer token", () => {
    expect(authorizeImport("Bearer s3cr3t", "s3cr3t")).toEqual({ ok: true });
  });

  it("accepts even when the EXPECTED env value has trailing whitespace/newline", () => {
    // The exact bug this fix targets: the Vercel env value pasted with a newline.
    expect(authorizeImport("Bearer s3cr3t", "s3cr3t\n")).toEqual({ ok: true });
    expect(authorizeImport("Bearer s3cr3t", "  s3cr3t  ")).toEqual({ ok: true });
  });

  it("accepts when either side has accidental surrounding quotes (symmetric with MCP)", () => {
    expect(authorizeImport("Bearer s3cr3t", '"s3cr3t"')).toEqual({ ok: true });
    expect(authorizeImport("Bearer 's3cr3t'", "s3cr3t")).toEqual({ ok: true });
  });

  it("503-path: reports not_configured when the env value is empty/whitespace", () => {
    expect(authorizeImport("Bearer x", undefined)).toMatchObject({
      ok: false,
      reason: "not_configured",
    });
    expect(authorizeImport("Bearer x", "   ")).toMatchObject({
      ok: false,
      reason: "not_configured",
    });
  });

  it("401-path: unauthorized with length diagnostics (no token value)", () => {
    const r = authorizeImport("Bearer wrong", "s3cr3t");
    expect(r).toMatchObject({ ok: false, reason: "unauthorized" });
    if (r.ok) return;
    expect(r.expectedLength).toBe(6);
    expect(r.providedLength).toBe(5);
  });

  it("401-path: missing Authorization header", () => {
    expect(authorizeImport(null, "s3cr3t")).toMatchObject({
      ok: false,
      reason: "unauthorized",
      providedLength: 0,
    });
  });
});
