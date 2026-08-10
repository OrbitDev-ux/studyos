import { describe, expect, it } from "vitest";
import { QUESTION_TYPE_LABEL } from "@/features/problems/constants";
import { questionTypeInstruction } from "@/features/ai/prompts/problem-generation";

describe("common question types (서술형 added)", () => {
  it("labels cover 객관식 / 단답형 / 서술형", () => {
    expect(QUESTION_TYPE_LABEL.MULTIPLE_CHOICE).toBe("객관식");
    expect(QUESTION_TYPE_LABEL.SHORT_ANSWER).toBe("단답형");
    expect(QUESTION_TYPE_LABEL.ESSAY).toBe("서술형");
  });

  it("MULTIPLE_CHOICE instruction requires choices + one correct", () => {
    const s = questionTypeInstruction("MULTIPLE_CHOICE");
    expect(s).toContain("choices");
    expect(s).toContain("isCorrect");
  });

  it("SHORT_ANSWER instruction fills answerText only", () => {
    const s = questionTypeInstruction("SHORT_ANSWER");
    expect(s).toContain("answerText");
    expect(s).toContain("choices는 비워");
  });

  it("ESSAY instruction requires written reasoning + model answer + scoring criteria, not MC/short", () => {
    const s = questionTypeInstruction("ESSAY");
    expect(s).toContain("서술");
    expect(s).toContain("모범 답안"); // → answerText
    expect(s).toContain("핵심 채점 요소"); // → scoringCriteria
    expect(s).toContain("answerText");
    expect(s).toContain("scoringCriteria");
    // explicitly must NOT collapse to short/MC
    expect(s).toContain("객관식으로 만들지 마세요");
  });
});
