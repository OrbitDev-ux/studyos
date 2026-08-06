"use server";

import { AuthError } from "next-auth";
import { hashPassword } from "@/features/auth/password";
import {
  emailSignInSchema,
  emailSignUpSchema,
  type EmailSignInValues,
  type EmailSignUpValues,
} from "@/features/auth/schema";
import { seedDefaultSubjects } from "@/features/subjects/seed";
import { Prisma } from "@/generated/prisma/client";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const INVALID_CREDENTIALS_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다.";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function signInWithEmail(
  values: EmailSignInValues,
): Promise<{ error?: string }> {
  const parsed = emailSignInSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID_CREDENTIALS_ERROR };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/dashboard" });
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
        data: { name: parsed.data.name, email: parsed.data.email, password: passwordHash },
      });
      await seedDefaultSubjects(user.id, tx);
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
      redirectTo: "/dashboard",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error: "가입은 완료됐지만 로그인에 실패했어요. 로그인 페이지에서 다시 시도해주세요.",
      };
    }
    throw err;
  }
}
