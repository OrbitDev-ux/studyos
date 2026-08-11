import { describe, expect, it } from "vitest";
import { validateImportProblem } from "@/features/problems/import/validation";
import type { RawImportProblem } from "@/features/problems/import/types";

// Valid taxonomy path from the static curriculum (elem-5 · math · fraction-mult).
const TAXO = { gradeId: "elem-5", subjectId: "math", unitId: "fraction-mult" };

const mc = (over: Partial<RawImportProblem> = {}): RawImportProblem => ({
  ...TAXO,
  difficulty: "medium",
  type: "multiple_choice",
  prompt: "3/4 × 2/5의 값은?",
  explanation: "분자끼리, 분모끼리 곱합니다.",
  choices: ["3/10", "2/5", "5/8", "6/20"],
  answerText: "3/10",
  ...over,
});

describe("validateImportProblem — valid cases", () => {
  it("accepts a valid multiple-choice problem and canonicalizes it", () => {
    const r = validateImportProblem(mc());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.subjectName).toBe("수학");
    expect(r.value.unit).toBe("분수의 곱셈");
    expect(r.value.type).toBe("MULTIPLE_CHOICE");
    expect(r.value.difficulty).toBe("MEDIUM");
    expect(r.value.choices?.find((c) => c.content === "3/10")?.isCorrect).toBe(true);
    expect(r.value.choices?.[0]?.label).toBe("A");
  });

  it("accepts short-answer with answerText", () => {
    const r = validateImportProblem({
      ...TAXO,
      difficulty: "easy",
      type: "short_answer",
      prompt: "2+2=?",
      explanation: "덧셈",
      answerText: "4",
    });
    expect(r.ok).toBe(true);
  });

  it("accepts essay with a model answer", () => {
    const r = validateImportProblem({
      ...TAXO,
      difficulty: "hard",
      type: "essay",
      prompt: "분수 곱셈의 원리를 설명하시오.",
      explanation: "개념 설명",
      answerText: "분자는 분자끼리, 분모는 분모끼리 곱한다 ...",
      scoringCriteria: "원리 언급, 예시 포함",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.scoringCriteria).toContain("원리");
  });
});

describe("validateImportProblem — rejections", () => {
  const reasonOf = (raw: RawImportProblem) => {
    const r = validateImportProblem(raw);
    return r.ok ? "OK" : r.reason;
  };

  it("rejects missing / oversized prompt", () => {
    expect(reasonOf(mc({ prompt: "" }))).toBe("missing_prompt");
    expect(reasonOf(mc({ prompt: "x".repeat(5000) }))).toBe("prompt_too_long");
  });
  it("rejects invalid difficulty and type", () => {
    expect(reasonOf(mc({ difficulty: "super-hard" }))).toBe("invalid_difficulty");
    expect(reasonOf(mc({ type: "true_false" }))).toBe("invalid_type");
  });
  it("rejects invalid taxonomy", () => {
    expect(reasonOf(mc({ subjectId: "nope" }))).toBe("invalid_taxonomy");
    expect(reasonOf(mc({ unitId: "nope" }))).toBe("invalid_taxonomy");
  });
  it("rejects bad multiple-choice", () => {
    expect(reasonOf(mc({ choices: ["only-one"] }))).toBe("mc_needs_at_least_2_choices");
    expect(reasonOf(mc({ choices: ["a", ""] }))).toBe("empty_choice");
    expect(reasonOf(mc({ choices: ["a", "a", "b"] }))).toBe("duplicate_choices");
    expect(reasonOf(mc({ answerText: "not-a-choice" }))).toBe("answer_not_in_choices");
  });
  it("rejects short-answer without an answer", () => {
    expect(
      reasonOf({ ...TAXO, difficulty: "easy", type: "short_answer", prompt: "q", explanation: "e" }),
    ).toBe("missing_answer_text");
  });
});
