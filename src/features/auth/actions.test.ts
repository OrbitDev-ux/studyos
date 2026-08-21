import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * signUpWithEmail had zero test coverage and, until tonight's overnight audit
 * fix, no rate limit at all (every other account-creation path — guest login,
 * password reset — already had one). This covers the new IP-based limit and
 * the audit-log write it counts against.
 */
const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("next/headers", () => ({ headers }));

// actions.ts imports `AuthError` directly from "next-auth" — the real package
// transitively requires "next/server" in a way this vitest environment can't
// resolve (unrelated to signUpWithEmail itself), so it's stubbed like every
// other dependency here.
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

const { getClientIp } = vi.hoisted(() => ({ getClientIp: vi.fn() }));
vi.mock("@/lib/ip", () => ({ getClientIp }));

const { hashPassword } = vi.hoisted(() => ({ hashPassword: vi.fn() }));
vi.mock("@/features/auth/password", () => ({ hashPassword }));

const { seedDefaultSubjects } = vi.hoisted(() => ({ seedDefaultSubjects: vi.fn() }));
vi.mock("@/features/subjects/seed", () => ({ seedDefaultSubjects }));

const { recordConsents } = vi.hoisted(() => ({ recordConsents: vi.fn() }));
vi.mock("@/features/legal/consent", () => ({
  recordConsents,
  SIGNUP_REQUIRED_CONSENTS: ["terms", "privacy"],
}));

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/lib/auth", () => ({ signIn, signOut: vi.fn(), auth: vi.fn() }));

const { auditLog, txUser, txAuditLog, transaction } = vi.hoisted(() => {
  const txUser = { create: vi.fn() };
  const txAuditLog = { create: vi.fn() };
  return {
    auditLog: { count: vi.fn() },
    txUser,
    txAuditLog,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ user: txUser, auditLog: txAuditLog }),
    ),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog, $transaction: transaction } }));

import { signUpWithEmail } from "@/features/auth/actions";

const SIGNUP_INPUT = {
  name: "학생",
  email: "student@example.com",
  password: "password123",
  agreeTerms: true as const,
  agreePrivacy: true as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  headers.mockResolvedValue(new Headers());
  getClientIp.mockReturnValue("1.2.3.4");
  hashPassword.mockResolvedValue("hashed");
  txUser.create.mockResolvedValue({ id: "user-1" });
  seedDefaultSubjects.mockResolvedValue(undefined);
  recordConsents.mockResolvedValue(undefined);
  signIn.mockResolvedValue(undefined);
});

describe("signUpWithEmail — rate limit", () => {
  it("blocks a new signup once the IP has hit the window's cap", async () => {
    auditLog.count.mockResolvedValue(10); // MAX_SIGNUPS_PER_IP

    const result = await signUpWithEmail(SIGNUP_INPUT);

    expect(result.error).toBe("잠시 후 다시 시도해주세요.");
    expect(txUser.create).not.toHaveBeenCalled();
  });

  it("allows the signup and records the audit-log event it counts against", async () => {
    auditLog.count.mockResolvedValue(0);

    const result = await signUpWithEmail(SIGNUP_INPUT);

    expect(result).toEqual({});
    expect(auditLog.count).toHaveBeenCalledWith({
      where: { event: "USER_SIGNED_UP", ip: "1.2.3.4", createdAt: expect.any(Object) },
    });
    expect(txAuditLog.create).toHaveBeenCalledWith({
      data: { userId: "user-1", event: "USER_SIGNED_UP", ip: "1.2.3.4" },
    });
  });

  it("does not rate-limit when the IP can't be determined", async () => {
    getClientIp.mockReturnValue(null);
    auditLog.count.mockResolvedValue(999); // would exceed the cap if checked

    const result = await signUpWithEmail(SIGNUP_INPUT);

    expect(result).toEqual({});
    expect(auditLog.count).not.toHaveBeenCalled();
  });
});
