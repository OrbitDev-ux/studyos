import { describe, expect, it } from "vitest";
import { emailSignUpSchema } from "@/features/auth/schema";
import { LEGAL_DOCUMENTS } from "@/features/legal/documents";
import { SIGNUP_REQUIRED_CONSENTS } from "@/features/legal/consent";

const validBase = {
  name: "홍길동",
  email: "test@example.com",
  password: "password123",
};

describe("signup consent enforcement (server-side schema)", () => {
  it("rejects signup when required consents are missing", () => {
    expect(emailSignUpSchema.safeParse(validBase).success).toBe(false);
  });

  it("rejects signup when a required consent is false", () => {
    const r = emailSignUpSchema.safeParse({
      ...validBase,
      agreeTerms: true,
      agreePrivacy: false,
    });
    expect(r.success).toBe(false);
  });

  it("accepts signup when both required consents are true", () => {
    const r = emailSignUpSchema.safeParse({
      ...validBase,
      agreeTerms: true,
      agreePrivacy: true,
    });
    expect(r.success).toBe(true);
  });

  it("required consents map to real documents with a current version", () => {
    for (const slug of SIGNUP_REQUIRED_CONSENTS) {
      expect(LEGAL_DOCUMENTS[slug]).toBeDefined();
      expect(LEGAL_DOCUMENTS[slug].version).toBeTruthy();
    }
  });
});
