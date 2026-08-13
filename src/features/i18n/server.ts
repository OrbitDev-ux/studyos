import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/features/i18n/config";
import { resolveLocale } from "@/features/i18n/resolve";

/**
 * Server-side locale for the current request — the ONE place SSR resolves it.
 * Reads (in priority order) the user's explicit choice, the studyos_locale
 * cookie, Accept-Language, then the edge country header (x-vercel-ip-country,
 * never the raw IP). Used by layouts so server and client agree (no hydration
 * mismatch).
 */
export async function getServerLocale(userLocale?: string | null): Promise<Locale> {
  const [c, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    userLocale: userLocale ?? null,
    cookieLocale: c.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: h.get("accept-language"),
    ipCountry: h.get("x-vercel-ip-country"),
  });
}
