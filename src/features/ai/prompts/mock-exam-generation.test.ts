import { describe, expect, it } from "vitest";
import { PASSAGE_COMPLETENESS_INSTRUCTION } from "@/features/ai/prompts/problem-generation";
import { buildMockExamGenerationPrompt } from "@/features/ai/prompts/mock-exam-generation";

describe("buildMockExamGenerationPrompt", () => {
  it("지문 포함 지시가 포함된다 (국어 지문형 문항 대응)", () => {
    const prompt = buildMockExamGenerationPrompt({ subjectName: "국어", count: 5 });
    expect(prompt).toContain(PASSAGE_COMPLETENESS_INSTRUCTION);
  });
});
