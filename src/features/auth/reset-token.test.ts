import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/features/auth/schema";
import {
  generateResetToken,
  hashResetToken,
  resetTokenHashEquals,
} from "@/features/auth/reset-token";

describe("reset token security", () => {
  it("generates high-entropy, unique, url-safe tokens", () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
  });

  it("hashes deterministically and never returns the raw token", () => {
    const token = generateResetToken();
    const h1 = hashResetToken(token);
    const h2 = hashResetToken(token);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(token);
    expect(h1).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(hashResetToken("other")).not.toBe(h1);
  });

  it("compares hashes in constant time correctly", () => {
    const token = generateResetToken();
    const h = hashResetToken(token);
    expect(resetTokenHashEquals(h, h)).toBe(true);
    expect(resetTokenHashEquals(h, hashResetToken("nope"))).toBe(false);
    expect(resetTokenHashEquals(h, "short")).toBe(false);
  });
});

describe("reset password validation (server policy)", () => {
  it("forgot: requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("reset: enforces min 8 / max 72 and confirm match", () => {
    const base = { token: "t" };
    expect(
      resetPasswordSchema.safeParse({ ...base, password: "abcd1234", confirmPassword: "abcd1234" })
        .success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ ...base, password: "short", confirmPassword: "short" })
        .success,
    ).toBe(false); // < 8
    expect(
      resetPasswordSchema.safeParse({ ...base, password: "abcd1234", confirmPassword: "different" })
        .success,
    ).toBe(false); // mismatch
    expect(
      resetPasswordSchema.safeParse({ ...base, password: "a".repeat(73), confirmPassword: "a".repeat(73) })
        .success,
    ).toBe(false); // > 72
    expect(
      resetPasswordSchema.safeParse({ token: "", password: "abcd1234", confirmPassword: "abcd1234" })
        .success,
    ).toBe(false); // empty token
  });
});
