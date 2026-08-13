"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/features/i18n/config";
import { getMessages, type Messages } from "@/features/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  /** Update the in-memory locale for instant UI switch (persistence is separate). */
  setLocaleState: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/** Seeded with the server-resolved locale so first paint matches (no hydration
 * mismatch). Client components read strings via useI18n(). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [current, setCurrent] = useState<Locale>(locale);
  const value = useMemo<I18nContextValue>(
    () => ({ locale: current, messages: getMessages(current), setLocaleState: setCurrent }),
    [current],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback if used outside a provider (e.g. marketing pages).
    return { locale: DEFAULT_LOCALE, messages: getMessages(DEFAULT_LOCALE), setLocaleState: () => {} };
  }
  return ctx;
}
