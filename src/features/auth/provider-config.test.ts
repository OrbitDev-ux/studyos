import { describe, expect, it } from "vitest";
import { isGoogleOAuthConfigured } from "@/features/auth/provider-config";

describe("isGoogleOAuthConfigured", () => {
  it("requires both credentials", () => {
    expect(isGoogleOAuthConfigured({})).toBe(false);
    expect(isGoogleOAuthConfigured({ AUTH_GOOGLE_ID: "id" })).toBe(false);
    expect(isGoogleOAuthConfigured({ AUTH_GOOGLE_SECRET: "secret" })).toBe(false);
  });

  it("enables Google only when both credentials are non-empty", () => {
    expect(
      isGoogleOAuthConfigured({ AUTH_GOOGLE_ID: " id ", AUTH_GOOGLE_SECRET: " secret " }),
    ).toBe(true);
    expect(
      isGoogleOAuthConfigured({ AUTH_GOOGLE_ID: " ", AUTH_GOOGLE_SECRET: "secret" }),
    ).toBe(false);
  });
});
