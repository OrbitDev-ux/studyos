import { describe, expect, it } from "vitest";
import { computeFingerprint, normalizeText } from "@/features/problems/import/fingerprint";
import type { NormalizedProblem } from "@/features/problems/import/types";

const mc = (over: Partial<NormalizedProblem> = {}): NormalizedProblem => ({
  subjectName: "수학",
  unit: "분수의 곱셈",
  difficulty: "MEDIUM",
  type: "MULTIPLE_CHOICE",
  prompt: "3/4 × 2/5의 값은?",
  explanation: "분자끼리, 분모끼리 곱합니다.",
  answerText: null,
  scoringCriteria: null,
  choices: [
    { label: "A", content: "3/10", isCorrect: true },
    { label: "B", content: "2/5", isCorrect: false },
    { label: "C", content: "5/8", isCorrect: false },
  ],
  ...over,
});

describe("normalizeText", () => {
  it("collapses whitespace/newlines and trims", () => {
    expect(normalizeText("  a\n\n b\t c ")).toBe("a b c");
  });
  it("applies NFKC (full-width → half-width)", () => {
    expect(normalizeText("１２３")).toBe("123");
  });
});

describe("computeFingerprint", () => {
  it("is identical when only whitespace/newlines differ", () => {
    expect(computeFingerprint(mc())).toBe(
      computeFingerprint(mc({ prompt: "3/4 × 2/5의   값은?\n" })),
    );
  });

  it("is identical regardless of choice order", () => {
    const reordered = mc({
      choices: [
        { label: "A", content: "5/8", isCorrect: false },
        { label: "B", content: "3/10", isCorrect: true },
        { label: "C", content: "2/5", isCorrect: false },
      ],
    });
    expect(computeFingerprint(mc())).toBe(computeFingerprint(reordered));
  });

  it("differs when the prompt differs", () => {
    expect(computeFingerprint(mc())).not.toBe(
      computeFingerprint(mc({ prompt: "3/4 + 2/5의 값은?" })),
    );
  });

  it("differs when the correct answer differs", () => {
    const otherAnswer = mc({
      choices: [
        { label: "A", content: "3/10", isCorrect: false },
        { label: "B", content: "2/5", isCorrect: true },
        { label: "C", content: "5/8", isCorrect: false },
      ],
    });
    expect(computeFingerprint(mc())).not.toBe(computeFingerprint(otherAnswer));
  });

  it("short-answer fingerprint keys off the answer text", () => {
    const base: NormalizedProblem = {
      subjectName: "수학",
      unit: null,
      difficulty: "EASY",
      type: "SHORT_ANSWER",
      prompt: "2+2=?",
      explanation: "덧셈",
      answerText: "4",
      scoringCriteria: null,
      choices: null,
    };
    expect(computeFingerprint(base)).toBe(
      computeFingerprint({ ...base, answerText: " 4 " }),
    );
    expect(computeFingerprint(base)).not.toBe(
      computeFingerprint({ ...base, answerText: "5" }),
    );
  });
});
