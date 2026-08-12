import { describe, expect, it } from "vitest";
import {
  AI_MAX_QUESTIONS,
  assertQuestionCount,
  checkQuestionCount,
  InvalidCountError,
} from "@/features/ai/generation-limits";
import { problemGenerationFormSchema } from "@/features/problems/schema";
import { mockExamGenerationFormSchema } from "@/features/mock-exam/schema";
import { studyBookFormSchema } from "@/features/study-books/schema";

describe("checkQuestionCount — central ceiling", () => {
  it("accepts valid counts within [1, 50]", () => {
    expect(checkQuestionCount(1)).toEqual({ ok: true, count: 1 });
    expect(checkQuestionCount(50)).toEqual({ ok: true, count: 50 });
    expect(checkQuestionCount(AI_MAX_QUESTIONS)).toEqual({ ok: true, count: 50 });
  });

  it("rejects over the ceiling (51, 100)", () => {
    expect(checkQuestionCount(51).ok).toBe(false);
    expect(checkQuestionCount(100).ok).toBe(false);
    expect((checkQuestionCount(51) as { error: string }).error).toContain("최대 50");
  });

  it("rejects 0, negatives, and decimals", () => {
    expect(checkQuestionCount(0).ok).toBe(false);
    expect(checkQuestionCount(-5).ok).toBe(false);
    expect(checkQuestionCount(2.5).ok).toBe(false);
  });

  it("coerces numeric strings but rejects non-numeric / non-finite", () => {
    expect(checkQuestionCount("10")).toEqual({ ok: true, count: 10 });
    expect(checkQuestionCount("51").ok).toBe(false);
    expect(checkQuestionCount("abc").ok).toBe(false);
    expect(checkQuestionCount(NaN).ok).toBe(false);
    expect(checkQuestionCount(Infinity).ok).toBe(false);
    expect(checkQuestionCount(null).ok).toBe(false);
    expect(checkQuestionCount(undefined).ok).toBe(false);
  });

  it("honors a stricter custom max", () => {
    expect(checkQuestionCount(10, 10).ok).toBe(true);
    expect(checkQuestionCount(11, 10).ok).toBe(false);
  });

  it("assertQuestionCount throws InvalidCountError on bad input", () => {
    expect(() => assertQuestionCount(51)).toThrow(InvalidCountError);
    expect(() => assertQuestionCount(0)).toThrow(InvalidCountError);
    expect(assertQuestionCount(5)).toBe(5);
  });
});

const problemBase = {
  gradeId: "g",
  subjectId: "s",
  unitId: "u",
  difficulty: "MEDIUM" as const,
  type: "MULTIPLE_CHOICE" as const,
};

describe("problemGenerationFormSchema.count (server validation)", () => {
  const count = (c: unknown) => problemGenerationFormSchema.safeParse({ ...problemBase, count: c }).success;
  it("accepts 1 and 10, rejects 0/11/51/100/negative/decimal", () => {
    expect(count(1)).toBe(true);
    expect(count(10)).toBe(true);
    expect(count("5")).toBe(true); // string coerced
    expect(count(0)).toBe(false);
    expect(count(11)).toBe(false); // stricter per-surface cap wins
    expect(count(51)).toBe(false);
    expect(count(100)).toBe(false);
    expect(count(-3)).toBe(false);
    expect(count(2.5)).toBe(false);
    expect(count("abc")).toBe(false);
  });
});

describe("mockExamGenerationFormSchema.count (server validation)", () => {
  const parse = (v: Record<string, unknown>) =>
    mockExamGenerationFormSchema.safeParse({ subjectId: "s", timeLimitMinutes: 30, ...v });
  it("accepts 5..50, rejects 4/51/100/0/negative/decimal", () => {
    expect(parse({ count: 5 }).success).toBe(true);
    expect(parse({ count: 50 }).success).toBe(true);
    expect(parse({ count: 4 }).success).toBe(false);
    expect(parse({ count: 51 }).success).toBe(false);
    expect(parse({ count: 100 }).success).toBe(false);
    expect(parse({ count: 0 }).success).toBe(false);
    expect(parse({ count: -5 }).success).toBe(false);
    expect(parse({ count: 10.5 }).success).toBe(false);
  });
  it("caps 객관식 + 서술형 combined at 50", () => {
    expect(parse({ count: 40, essayCount: 10 }).success).toBe(true); // 50 total
    expect(parse({ count: 45, essayCount: 10 }).success).toBe(false); // 55 total
    expect(parse({ count: 50, essayCount: 1 }).success).toBe(false); // 51 total
  });
});

const bookBase = {
  title: "책",
  gradeId: "g",
  subjectId: "s",
  unitId: "u",
  difficulty: "MEDIUM" as const,
  type: "concept_problem" as const,
};

describe("studyBookFormSchema counts (server validation)", () => {
  const parse = (v: Record<string, unknown>) =>
    studyBookFormSchema.safeParse({ ...bookBase, chapterCount: 2, problemsPerChapter: 3, ...v });
  it("caps chapterCount 1..4 and problemsPerChapter 1..5", () => {
    expect(parse({ chapterCount: 1 }).success).toBe(true);
    expect(parse({ chapterCount: 4, problemsPerChapter: 5 }).success).toBe(true);
    expect(parse({ chapterCount: 5 }).success).toBe(false);
    expect(parse({ chapterCount: 0 }).success).toBe(false);
    expect(parse({ chapterCount: -1 }).success).toBe(false);
    expect(parse({ problemsPerChapter: 6 }).success).toBe(false);
    expect(parse({ problemsPerChapter: 2.5 }).success).toBe(false);
    expect(parse({ chapterCount: "3" }).success).toBe(true); // coerced
  });
});
