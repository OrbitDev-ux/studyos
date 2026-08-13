import {
  DEFAULT_LOCALE,
  localeFromCountry,
  normalizeLocale,
  type Locale,
} from "@/features/i18n/config";

/**
 * Parse an Accept-Language header into an ordered list of language tags by
 * quality (q). Pure; malformed parts are skipped.
 * "ko-KR,ko;q=0.9,en-US;q=0.8" → ["ko-KR","ko","en-US"]
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = (rawTag ?? "").trim();
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}

/** First supported locale from an Accept-Language header (with language fallback). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  for (const tag of parseAcceptLanguage(header)) {
    const loc = normalizeLocale(tag);
    if (loc) return loc;
  }
  return null;
}

export type LocaleResolverInput = {
  /** The signed-in user's explicit choice (User.locale). null/undefined = AUTO. */
  userLocale?: string | null;
  /** studyos_locale cookie (a previously resolved/remembered locale). */
  cookieLocale?: string | null;
  /** Raw Accept-Language header. */
  acceptLanguage?: string | null;
  /** ISO country from the edge/CDN (e.g. x-vercel-ip-country). NEVER the raw IP. */
  ipCountry?: string | null;
};

/**
 * THE single source of truth for locale decisions. Priority (§1):
 *   1. explicit user choice  2. remembered cookie  3. browser Accept-Language
 *   4. IP country (fallback only)  5. DEFAULT_LOCALE
 * Every invalid/unsupported value is ignored (never trusted), so a bad
 * cookie/header/User.locale can never break resolution — it just falls through.
 */
export function resolveLocale(input: LocaleResolverInput): Locale {
  return (
    normalizeLocale(input.userLocale) ??
    normalizeLocale(input.cookieLocale) ??
    localeFromAcceptLanguage(input.acceptLanguage) ??
    localeFromCountry(input.ipCountry) ??
    DEFAULT_LOCALE
  );
}
