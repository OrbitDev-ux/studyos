"use server";

import { cookies } from "next/headers";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isSupportedLocale, LOCALE_COOKIE } from "@/features/i18n/config";
import { getServerLocale } from "@/features/i18n/server";

export type SetLocaleResult = {
  ok?: true;
  mode?: "auto" | "manual";
  /** Effective locale to apply now (detected value when switching to auto). */
  locale?: string | null;
  error?: string;
};

/**
 * Set the signed-in user's language preference. Owner-scoped (own row only) and
 * server-validated: only supported locales are accepted, anything else is
 * rejected — a bad/injected value can never be stored. `"auto"` clears the
 * explicit choice (User.locale = null) and returns the detected locale so the UI
 * can switch immediately. The cookie stores ONLY the locale (never PII/IP).
 */
export async function setLocalePreference(value: string): Promise<SetLocaleResult> {
  const user = await requireCurrentUser();
  const jar = await cookies();

  if (value === "auto") {
    await prisma.user.update({ where: { id: user.id }, data: { locale: null } });
    jar.delete(LOCALE_COOKIE);
    const detected = await getServerLocale(null);
    return { ok: true, mode: "auto", locale: detected };
  }

  if (!isSupportedLocale(value)) {
    return { error: "지원하지 않는 언어예요." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { locale: value } });
  jar.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true, mode: "manual", locale: value };
}
