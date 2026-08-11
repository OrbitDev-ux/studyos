import { describe, expect, it } from "vitest";
import {
  buildStudyBankHref,
  hasActiveFilters,
  parseStudyBankParams,
  type StudyBankParams,
} from "@/features/study-bank/search-params";

const base = (over: Partial<StudyBankParams> = {}): StudyBankParams => ({
  tab: "all",
  q: "",
  subject: "",
  unit: "",
  difficulty: "",
  type: "",
  sort: "recent",
  page: 1,
  ...over,
});

describe("parseStudyBankParams", () => {
  it("returns safe defaults for empty input", () => {
    expect(parseStudyBankParams({})).toEqual(base());
  });

  it("rejects invalid enum/tab/sort/difficulty/type and bad page", () => {
    const p = parseStudyBankParams({
      tab: "nope",
      sort: "weird",
      difficulty: "SUPER_HARD",
      type: "TRUE_FALSE",
      page: "-3",
    });
    expect(p.tab).toBe("all");
    expect(p.sort).toBe("recent");
    expect(p.difficulty).toBe("");
    expect(p.type).toBe("");
    expect(p.page).toBe(1);
  });

  it("parses valid values", () => {
    const p = parseStudyBankParams({
      tab: "wrong",
      q: "  분수  ",
      subject: "subj1",
      unit: "분수의 곱셈",
      difficulty: "HARD",
      type: "ESSAY",
      sort: "difficulty_desc",
      page: "3",
    });
    expect(p).toEqual(
      base({
        tab: "wrong",
        q: "분수",
        subject: "subj1",
        unit: "분수의 곱셈",
        difficulty: "HARD",
        type: "ESSAY",
        sort: "difficulty_desc",
        page: 3,
      }),
    );
  });

  it("takes the first value of array params", () => {
    expect(parseStudyBankParams({ difficulty: ["EASY", "HARD"] }).difficulty).toBe("EASY");
  });
});

describe("buildStudyBankHref", () => {
  it("omits default values", () => {
    expect(buildStudyBankHref(base())).toBe("/study-bank");
  });

  it("serializes only non-default params", () => {
    const href = buildStudyBankHref(base({ tab: "saved", difficulty: "HARD" }));
    expect(href).toBe("/study-bank?tab=saved&difficulty=HARD");
  });

  it("resets page to 1 when a filter changes", () => {
    const href = buildStudyBankHref(base({ page: 5 }), { subject: "s1" });
    expect(href).toContain("subject=s1");
    expect(href).not.toContain("page=");
  });

  it("keeps the page when page is explicitly overridden", () => {
    expect(buildStudyBankHref(base(), { page: 4 })).toBe("/study-bank?page=4");
  });

  it("does not reset page for tab/sort changes carrying an explicit page", () => {
    const href = buildStudyBankHref(base({ page: 2 }), { sort: "oldest" });
    expect(href).toContain("sort=oldest");
    expect(href).toContain("page=2");
  });
});

describe("hasActiveFilters", () => {
  it("is false with only tab/sort/page set", () => {
    expect(hasActiveFilters(base({ tab: "saved", sort: "oldest", page: 3 }))).toBe(false);
  });
  it("is true when any narrowing filter is set", () => {
    expect(hasActiveFilters(base({ q: "x" }))).toBe(true);
    expect(hasActiveFilters(base({ subject: "s" }))).toBe(true);
    expect(hasActiveFilters(base({ difficulty: "EASY" }))).toBe(true);
  });
});
