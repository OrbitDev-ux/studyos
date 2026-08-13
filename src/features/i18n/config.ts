/**
 * Central locale config. Supported locales + default live here only (no
 * hardcoding elsewhere). Adding a locale = one entry here + a message file.
 */

export const SUPPORTED_LOCALES = ["ko-KR", "en-US", "ja-JP", "zh-CN"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ko-KR";

export const LOCALE_CONFIG: Record<Locale, { label: string; english: string }> = {
  "ko-KR": { label: "한국어", english: "Korean" },
  "en-US": { label: "English", english: "English" },
  "ja-JP": { label: "日本語", english: "Japanese" },
  "zh-CN": { label: "中文", english: "Chinese" },
};

export const LOCALE_COOKIE = "studyos_locale";

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Map a raw locale/language tag to a supported locale, using a language-code
 * fallback (en-GB → en-US, ja → ja-JP), but ONLY when the result is supported.
 * Returns null when nothing supported matches.
 */
export function normalizeLocale(raw: string | null | undefined): Locale | null {
  if (!raw) return null;
  const tag = raw.trim();
  if (isSupportedLocale(tag)) return tag;
  // Match by primary language subtag (case-insensitive).
  const lang = tag.toLowerCase().split("-")[0] ?? "";
  const byLang: Record<string, Locale> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
  return byLang[lang] ?? null;
}

/**
 * ISO-3166 country → locale, used ONLY as the IP-based fallback. Deliberately
 * small; unknown countries fall through to the default in the resolver.
 */
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  KR: "ko-KR",
  US: "en-US",
  CA: "en-US",
  GB: "en-US",
  AU: "en-US",
  JP: "ja-JP",
  CN: "zh-CN",
  TW: "zh-CN",
  HK: "zh-CN",
};

export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  return COUNTRY_TO_LOCALE[country.toUpperCase()] ?? null;
}
