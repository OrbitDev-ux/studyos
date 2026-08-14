import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/features/i18n/config";
import { getMessages } from "@/features/i18n/messages";

/**
 * i18n coverage guard (stands in for the browser "switch to ko/en/ja/zh" E2E,
 * which needs a running app): every locale must implement exactly the same
 * key shape as the ko-KR source of truth, and no string may be blank.
 */
function keyPaths(obj: Record<string, Record<string, string>>): string[] {
  const paths: string[] = [];
  for (const [ns, group] of Object.entries(obj)) {
    for (const key of Object.keys(group)) paths.push(`${ns}.${key}`);
  }
  return paths.sort();
}

describe("message dictionary completeness", () => {
  const source = getMessages("ko-KR") as unknown as Record<string, Record<string, string>>;
  const sourcePaths = keyPaths(source);

  for (const locale of SUPPORTED_LOCALES) {
    it(`${locale} implements every ko-KR key with non-empty text`, () => {
      const messages = getMessages(locale) as unknown as Record<string, Record<string, string>>;
      expect(keyPaths(messages)).toEqual(sourcePaths);
      for (const [ns, group] of Object.entries(messages)) {
        for (const [key, value] of Object.entries(group)) {
          expect(typeof value, `${locale} ${ns}.${key}`).toBe("string");
          expect(value.trim().length, `${locale} ${ns}.${key}`).toBeGreaterThan(0);
        }
      }
    });
  }
});
