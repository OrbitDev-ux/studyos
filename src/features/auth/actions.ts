"use server";

import { AuthError } from "next-auth";
import { hashPassword } from "@/features/auth/password";
import { recordConsents, SIGNUP_REQUIRED_CONSENTS } from "@/features/legal/consent";
import {
  emailSignInSchema,
  emailSignUpSchema,
  type EmailSignInValues,
  type EmailSignUpValues,
} from "@/features/auth/schema";
import { seedDefaultSubjects } from "@/features/subjects/seed";
import { Prisma } from "@/generated/prisma/client";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVALID_CREDENTIALS_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다.";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard?welcome=1" });
}

export async function signOutAction() {
  // Mark the user OFFLINE immediately on an explicit sign-out rather than
  // waiting for the presence heartbeat to go stale.
  const session = await auth();
  if (session?.user?.id) {
    await prisma.user
      .update({ where: { id: session.user.id }, data: { lastSeenAt: null } })
      .catch(() => {});
  }
  await signOut({ redirectTo: "/login" });
}

/**
 * Lift the ban on the currently signed-in account (the ⌘+1 recovery shortcut
 * on /suspended). The JWT session is still valid while banned, so the user id
 * comes from auth(); we just clear the bannedAt/banReason flags.
 *
 * NOTE: this is a self-service unban — any banned user who reaches /suspended
 * can lift their own ban with it. It exists as an escape hatch; gate it behind
 * the admin code if bans must be enforceable against the account holder.
 */
export async function unbanSelf(): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { bannedAt: null, banReason: null },
  });
  return {};
}

/**
 * Create a throwaway guest account and sign in immediately — a no-signup way
 * to try the app (and a path back in for someone whose account was banned).
 * The account is a normal User with a recognizable @guest.* email and a random
 * password (never shown), seeded with the default subjects like any new user.
 * Uses redirect:false + a returned result so the client navigates itself,
 * avoiding the redirect-in-catch "failed" flash.
 */
export async function signInAsGuest(): Promise<{ error?: string }> {
  const token = crypto.randomUUID();
  const email = `guest_${token}@guest.studyos.app`;
  const password = crypto.randomUUID();
  const name = `게스트 ${token.slice(0, 4)}`;

  try {
    const passwordHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: passwordHash },
      });
      await seedDefaultSubjects(user.id, tx);
    });
  } catch {
    return { error: "게스트 계정 생성에 실패했어요. 잠시 후 다시 시도해주세요." };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "게스트 로그인에 실패했어요. 다시 시도해주세요." };
    }
    throw err;
  }
}

export async function signInWithEmail(
  values: EmailSignInValues,
): Promise<{ error?: string }> {
  const parsed = emailSignInSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID_CREDENTIALS_ERROR };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard?welcome=1" });
    return {};
  } catch (err) {
    // signIn() throws Next.js's redirect control-flow exception on success —
    // only AuthError means the credentials were actually rejected.
    if (err instanceof AuthError) {
      return { error: INVALID_CREDENTIALS_ERROR };
    }
    throw err;
  }
}

export async function signUpWithEmail(
  values: EmailSignUpValues,
): Promise<{ error?: string }> {
  const parsed = emailSignUpSchema.safeParse(values);
  if (!parsed.success) return { error: "입력값을 확인해주세요." };

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          password: passwordHash,
        },
      });
      await seedDefaultSubjects(user.id, tx);
      // Record the required legal consents (약관 · 개인정보 처리방침) at their
      // current versions — the schema already verified agreement server-side.
      await recordConsents(tx, user.id, SIGNUP_REQUIRED_CONSENTS);
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "이미 가입된 이메일이에요." };
    }
    throw err;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard?welcome=1",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error:
          "가입은 완료됐지만 로그인에 실패했어요. 로그인 페이지에서 다시 시도해주세요.",
      };
    }
    throw err;
  }
}
