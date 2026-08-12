"use server";

import { headers } from "next/headers";
import { hashPassword } from "@/features/auth/password";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/features/auth/schema";
import {
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
} from "@/features/auth/reset-token";
import { sendEmail } from "@/lib/email";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";

/** Same message whether or not an account exists — prevents account enumeration. */
const GENERIC_FORGOT_MESSAGE =
  "입력하신 정보와 일치하는 계정이 있다면 안내 메시지를 발송했습니다.";

// Rate limits (defense against enumeration probing + email bombing). Counted
// from PasswordResetToken rows, so no extra table is needed.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_IP = 5;
const MAX_PER_USER = 3;

function resetUrl(origin: string, token: string): string {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL ?? "https://studyos.app";
}

/**
 * Start password recovery. Always returns the same generic message (never
 * reveals whether the email exists). When the account exists and isn't rate
 * limited, a single-use, hashed, 1-hour token is stored and a reset link is
 * emailed via the shared adapter. The raw token is never stored or returned.
 */
export async function requestPasswordReset(
  values: ForgotPasswordValues,
): Promise<{ message: string }> {
  const parsed = forgotPasswordSchema.safeParse(values);
  // Even on invalid input, avoid signaling anything useful.
  if (!parsed.success) return { message: GENERIC_FORGOT_MESSAGE };
  const { email } = parsed.data;

  const ip = getClientIp(await headers());
  const since = new Date(Date.now() - RATE_WINDOW_MS);

  try {
    // IP-level throttle (covers enumeration attempts across many emails).
    if (ip) {
      const ipCount = await prisma.passwordResetToken.count({
        where: { requestIp: ip, createdAt: { gte: since } },
      });
      if (ipCount >= MAX_PER_IP) return { message: GENERIC_FORGOT_MESSAGE };
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return { message: GENERIC_FORGOT_MESSAGE };

    // Per-user throttle.
    const userCount = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: since } },
    });
    if (userCount >= MAX_PER_USER) return { message: GENERIC_FORGOT_MESSAGE };

    // Invalidate any outstanding unused tokens, then issue a fresh one.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        requestIp: ip,
      },
    });

    const origin = await requestOrigin();
    await sendEmail({
      to: email,
      subject: "[StudyOS] 비밀번호 재설정 안내",
      text: `아래 링크에서 비밀번호를 재설정하세요 (1시간 내 유효):\n\n${resetUrl(origin, token)}\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.`,
    });
  } catch {
    // Never surface internal errors here — keep the response uniform.
    return { message: GENERIC_FORGOT_MESSAGE };
  }

  return { message: GENERIC_FORGOT_MESSAGE };
}

/**
 * Complete password recovery. Validates the token (hash lookup, unexpired,
 * unused), sets the new password, stamps passwordChangedAt (invalidates older
 * web sessions via requireCurrentUser), and single-uses the token.
 */
export async function resetPassword(
  values: ResetPasswordValues,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      error: "링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.",
    };
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  // Atomic: set password + invalidate sessions + single-use the token.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: passwordHash, passwordChangedAt: now },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    // Kill any other outstanding tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { ok: true };
}
