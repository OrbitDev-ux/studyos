"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCodeSchema, type AdminCodeValues } from "@/features/admin/schema";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken } from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

const GENERIC_ERROR = "관리자 코드가 올바르지 않습니다.";
const RATE_LIMITED_ERROR = "잠시 후 다시 시도해주세요.";

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return (forwardedFor.split(",")[0] ?? "unknown").trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

// Hash both sides to a fixed length before comparing so the comparison
// itself is constant-time regardless of the submitted code's length —
// crypto.subtle.verify-style safety without needing equal-length inputs.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= (bytesA[i] ?? 0) ^ (bytesB[i] ?? 0);
  return diff === 0;
}

export async function verifyAdminCode(values: AdminCodeValues): Promise<{ error?: string }> {
  const parsed = adminCodeSchema.safeParse(values);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const ip = await getClientIp();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  const recentAttempts = await prisma.adminLoginAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  if (recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { error: RATE_LIMITED_ERROR };
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const valid = Boolean(adminSecret) && (await timingSafeEqual(parsed.data.code, adminSecret!));

  await prisma.adminLoginAttempt.create({ data: { ip, success: valid } });

  if (!valid) {
    return { error: GENERIC_ERROR };
  }

  const token = await createAdminSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  redirect("/admin");
}

export async function adminSignOut() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/");
}
