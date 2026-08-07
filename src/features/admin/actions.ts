"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminUser } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import {
  adminCodeSchema,
  adminCredentialsSchema,
  type AdminCodeValues,
  type AdminCredentialsValues,
} from "@/features/admin/schema";
import { getCurrentAdmin, getRequestIp } from "@/lib/admin/context";
import { ADMIN_ACTIONS, logAdminActivity } from "@/lib/admin/activity";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
} from "@/lib/admin/session";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

const GENERIC_ERROR = "인증 정보가 올바르지 않습니다.";
const RATE_LIMITED_ERROR = "잠시 후 다시 시도해주세요.";
const BLOCKED_ERROR = "차단된 접근입니다.";

const BOOTSTRAP_EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "root@studyos.local";

// Hash both sides to a fixed length before comparing so the comparison itself
// is constant-time regardless of the submitted code's length.
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

async function isRateLimited(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  // Count only FAILED attempts — a successful login must never push a
  // legitimate admin toward their own lockout. Brute-force protection is
  // unchanged since only wrong guesses accumulate.
  const recentFailures = await prisma.adminLoginAttempt.count({
    where: { ip, success: false, createdAt: { gte: windowStart } },
  });
  return recentFailures >= RATE_LIMIT_MAX_ATTEMPTS;
}

async function isBlockedIp(ip: string): Promise<boolean> {
  if (ip === "unknown") return false;
  const blocked = await prisma.blockedIp.findUnique({ where: { ip } });
  return Boolean(blocked);
}

/** Mint the session cookie, stamp lastLoginAt, and record the successful
 * sign-in. Shared by both the passphrase and credential paths. */
async function establishSession(admin: AdminUser, ip: string): Promise<void> {
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createAdminSessionToken({ sub: admin.id, role: admin.role });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.LOGIN, ip });
}

/** Passphrase entry: verifies ADMIN_SECRET and signs in as the bootstrap
 * SUPER_ADMIN, creating that account on first use. This is the only way the
 * first admin ever gets in; every later admin uses email + password. */
export async function verifyAdminCode(
  values: AdminCodeValues,
): Promise<{ error?: string }> {
  const parsed = adminCodeSchema.safeParse(values);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const ip = await getRequestIp();
  if (await isBlockedIp(ip)) return { error: BLOCKED_ERROR };
  if (await isRateLimited(ip)) return { error: RATE_LIMITED_ERROR };

  const adminSecret = process.env.ADMIN_SECRET;
  const valid =
    Boolean(adminSecret) && (await timingSafeEqual(parsed.data.code, adminSecret!));

  await prisma.adminLoginAttempt.create({ data: { ip, success: valid } });
  if (!valid) return { error: GENERIC_ERROR };

  // Upsert the bootstrap super admin. Its password is the passphrase itself,
  // so it can also sign in via the credential form using BOOTSTRAP_EMAIL.
  const passwordHash = await hashPassword(adminSecret!);
  const admin = await prisma.adminUser.upsert({
    where: { email: BOOTSTRAP_EMAIL },
    create: {
      email: BOOTSTRAP_EMAIL,
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
    update: { role: "SUPER_ADMIN", isActive: true, passwordHash },
  });

  await establishSession(admin, ip);
  // Return success (cookie already set) and let the client navigate — a
  // server-side redirect() here surfaces to the client form's try/catch as a
  // thrown signal and flashed a spurious "failed" message before navigating.
  return {};
}

/** Credential entry for admins created by a super admin. */
export async function verifyAdminCredentials(
  values: AdminCredentialsValues,
): Promise<{ error?: string }> {
  const parsed = adminCredentialsSchema.safeParse(values);
  if (!parsed.success) return { error: GENERIC_ERROR };

  const ip = await getRequestIp();
  if (await isBlockedIp(ip)) return { error: BLOCKED_ERROR };
  if (await isRateLimited(ip)) return { error: RATE_LIMITED_ERROR };

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  // verifyPassword runs bcrypt.compare even when admin is null (dummy hash),
  // so a missing account and a wrong password take the same time.
  const passwordOk = await verifyPassword(
    parsed.data.password,
    admin?.passwordHash ?? null,
  );
  const valid = Boolean(admin) && admin!.isActive && passwordOk;

  await prisma.adminLoginAttempt.create({
    data: { ip, email: parsed.data.email, success: valid },
  });
  if (!valid || !admin) return { error: GENERIC_ERROR };

  await establishSession(admin, ip);
  // Return success (cookie already set) and let the client navigate — a
  // server-side redirect() here surfaces to the client form's try/catch as a
  // thrown signal and flashed a spurious "failed" message before navigating.
  return {};
}

export async function adminSignOut() {
  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminActivity({ adminId: admin.id, action: ADMIN_ACTIONS.LOGOUT });
  }
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/");
}
