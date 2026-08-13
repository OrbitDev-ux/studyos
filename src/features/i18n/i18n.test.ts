import { describe, expect, it } from "vitest";
import {
  isSupportedLocale,
  localeFromCountry,
  normalizeLocale,
} from "@/features/i18n/config";
import {
  localeFromAcceptLanguage,
  parseAcceptLanguage,
  resolveLocale,
} from "@/features/i18n/resolve";
import { problemLocaleInstruction, tutorLocaleInstruction } from "@/features/i18n/ai";
import { getMessages } from "@/features/i18n/messages";
import { SUPPORTED_LOCALES } from "@/features/i18n/config";

describe("locale config + normalization", () => {
  it("validates only supported locales", () => {
    expect(isSupportedLocale("ko-KR")).toBe(true);
    expect(isSupportedLocale("en-US")).toBe(true);
    expect(isSupportedLocale("fr-FR")).toBe(false);
    expect(isSupportedLocale("hacker")).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });
  it("falls back by language subtag but only to supported locales", () => {
    expect(normalizeLocale("en-GB")).toBe("en-US");
    expect(normalizeLocale("ja")).toBe("ja-JP");
    expect(normalizeLocale("ko")).toBe("ko-KR");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN"); // language-subtag fallback
    expect(normalizeLocale("fr")).toBeNull();
    expect(normalizeLocale("")).toBeNull();
  });
  it("maps IP country only to supported locales", () => {
    expect(localeFromCountry("KR")).toBe("ko-KR");
    expect(localeFromCountry("us")).toBe("en-US");
    expect(localeFromCountry("TW")).toBe("zh-CN");
    expect(localeFromCountry("XX")).toBeNull();
    expect(localeFromCountry(null)).toBeNull();
  });
});

describe("Accept-Language parsing", () => {
  it("orders by q and picks the first supported", () => {
    expect(parseAcceptLanguage("ko-KR,ko;q=0.9,en-US;q=0.8")).toEqual(["ko-KR", "ko", "en-US"]);
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,ko;q=0.8")).toBe("en-US");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9,ja;q=0.5")).toBe("ja-JP"); // skip unsupported
    expect(localeFromAcceptLanguage("")).toBeNull();
  });
});

describe("resolveLocale — priority order", () => {
  it("user manual choice wins over everything", () => {
    expect(
      resolveLocale({
        userLocale: "en-US",
        cookieLocale: "ko-KR",
        acceptLanguage: "ko-KR",
        ipCountry: "KR",
      }),
    ).toBe("en-US");
  });
  it("cookie beats browser and IP", () => {
    expect(resolveLocale({ cookieLocale: "ja-JP", acceptLanguage: "ko-KR", ipCountry: "KR" })).toBe(
      "ja-JP",
    );
  });
  it("browser beats IP", () => {
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9", ipCountry: "KR" })).toBe("en-US");
  });
  it("IP country used only as fallback", () => {
    expect(resolveLocale({ ipCountry: "JP" })).toBe("ja-JP");
    expect(resolveLocale({ ipCountry: "CN" })).toBe("zh-CN");
  });
  it("always returns the default on total failure / bad values", () => {
    expect(resolveLocale({})).toBe("ko-KR");
    expect(
      resolveLocale({ userLocale: "garbage", cookieLocale: "x", acceptLanguage: "??", ipCountry: "ZZ" }),
    ).toBe("ko-KR");
  });
  it("KR + explicit en-US → en-US (VPN/traveler case)", () => {
    expect(resolveLocale({ userLocale: "en-US", ipCountry: "KR" })).toBe("en-US");
  });
});

describe("AI locale instructions + message coverage", () => {
  it("problem instruction is empty for default (ko) and names the language otherwise", () => {
    expect(problemLocaleInstruction("ko-KR")).toBe("");
    expect(problemLocaleInstruction("en-US")).toContain("English");
    expect(problemLocaleInstruction("ja-JP")).toContain("Japanese");
    expect(problemLocaleInstruction("en-US")).toContain("LaTeX");
  });
  it("tutor instruction always sets the reply language + LaTeX rule", () => {
    expect(tutorLocaleInstruction("zh-CN")).toContain("中文");
    expect(tutorLocaleInstruction("ja-JP")).toContain("LaTeX");
  });
  it("every supported locale has a complete message dictionary", () => {
    for (const l of SUPPORTED_LOCALES) {
      const m = getMessages(l);
      expect(m.common.save).toBeTruthy();
      expect(m.nav.settings).toBeTruthy();
      expect(m.language.auto).toBeTruthy();
    }
  });
});
