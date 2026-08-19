import { describe, expect, it } from "vitest";
import {
  PASSAGE_COMPLETENESS_INSTRUCTION,
  buildProblemGenerationPrompt,
  buildSimilarProblemPrompt,
} from "@/features/ai/prompts/problem-generation";
import { resolveTaxonomy } from "@/features/curriculum/taxonomy";

describe("buildProblemGenerationPrompt", () => {
  // Regression for a real user report: a 중학교 1학년 국어 작문 문제 came back
  // referencing "다음 문단" (a passage the question is about) with no
  // paragraph anywhere in the generated text — because nothing in the prompt
  // told the model that a referenced passage must be written out in full.
  it("중학교 1학년 국어 작문 요청에는 지문 포함 지시와 학년 수준이 전달된다", () => {
    const prompt = buildProblemGenerationPrompt({
      subjectName: "국어",
      unit: "쓰기 (작문)",
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      count: 3,
      gradeName: "중학교 1학년",
      schoolLevelName: "중학교",
      curriculumLabel: "2022 개정 교육과정",
    });

    expect(prompt).toContain(PASSAGE_COMPLETENESS_INSTRUCTION);
    expect(prompt).toContain("교육과정: 2022 개정 교육과정");
    expect(prompt).toContain("학교급: 중학교");
    expect(prompt).toContain("학년: 중학교 1학년");
    expect(prompt).not.toContain("고등학생");
  });

  // End-to-end: the same (grade → subject → unit) selection a user actually
  // made, resolved through the real taxonomy (not hand-typed strings), then
  // built into the real prompt. This is the exact contract PHASE 10 asks for.
  it("중학교/1학년/국어/작문 선택이 실제 curriculum 해석을 거쳐 prompt까지 전달된다", () => {
    const resolved = resolveTaxonomy({
      gradeId: "middle-1",
      subjectId: "korean",
      unitId: "writing",
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const prompt = buildProblemGenerationPrompt({
      subjectName: resolved.value.subjectName,
      unit: resolved.value.unitName ?? undefined,
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      count: 3,
      gradeName: resolved.value.gradeName,
      schoolLevelName: resolved.value.schoolLevelName,
      curriculumLabel: resolved.value.curriculumLabel,
    });

    expect(prompt).toContain("중학교");
    expect(prompt).toContain("1학년");
    expect(prompt).toContain("국어");
    expect(prompt).toContain("쓰기 (작문)");
    expect(prompt).toContain(PASSAGE_COMPLETENESS_INSTRUCTION);
  });

  it("gradeName이 없는 호출(유사 문제 재생성 등)은 기존 문구를 그대로 유지한다", () => {
    const prompt = buildProblemGenerationPrompt({
      subjectName: "수학",
      unit: "미적분",
      difficulty: "HARD",
      type: "SHORT_ANSWER",
      count: 1,
    });

    expect(prompt).toContain("한국 고등학생 수준");
    expect(prompt).toContain(PASSAGE_COMPLETENESS_INSTRUCTION);
  });
});

describe("buildSimilarProblemPrompt", () => {
  it("지문 포함 지시가 포함된다", () => {
    const prompt = buildSimilarProblemPrompt({
      subjectName: "국어",
      unit: "쓰기 (작문)",
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      originalPrompt: "다음 문단의 마지막 문장으로 가장 적절한 것은?",
    });

    expect(prompt).toContain(PASSAGE_COMPLETENESS_INSTRUCTION);
  });
});
