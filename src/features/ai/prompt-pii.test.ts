import { describe, expect, it } from "vitest";
import { buildProblemGenerationPrompt } from "@/features/ai/prompts/problem-generation";
import { buildWeaknessAnalysisPrompt } from "@/features/ai/prompts/weakness-analysis";
import { buildWrongAnswerDnaPrompt } from "@/features/ai/prompts/wrong-answer-dna";

/**
 * Privacy guard: AI prompt builders must carry only learning context and must
 * never embed authentication/identity/payment PII. These builders receive
 * structured learning inputs; here we feed representative inputs that DELIBERATELY
 * carry no PII and assert the produced prompt stays PII-free — so a regression
 * that starts interpolating email/token/ip/userId/password into a prompt fails.
 */
const FORBIDDEN = [
  "password",
  "passwordHash",
  "sessionToken",
  "accessToken",
  "authToken",
  "@example.com", // email
  "192.168", // ip
  "userId",
  "cuid",
];

function assertNoPii(prompt: string) {
  for (const token of FORBIDDEN) {
    expect(prompt.toLowerCase()).not.toContain(token.toLowerCase());
  }
}

describe("AI prompt PII minimization", () => {
  it("problem generation prompt carries only learning context", () => {
    const prompt = buildProblemGenerationPrompt({
      subjectName: "수학",
      unit: "미적분",
      difficulty: "MEDIUM",
      type: "MULTIPLE_CHOICE",
      count: 5,
    });
    assertNoPii(prompt);
    expect(prompt).toContain("수학");
  });

  it("weakness analysis prompt carries only subject/unit/problem", () => {
    const prompt = buildWeaknessAnalysisPrompt([
      { subject: "영어", unit: "문법", prompt: "관계대명사 that의 쓰임은?" },
    ]);
    assertNoPii(prompt);
  });

  it("wrong-answer DNA prompt carries only the academic answer, not identity", () => {
    const prompt = buildWrongAnswerDnaPrompt({
      prompt: "2 + 2 = ?",
      userAnswer: "5",
      correctAnswer: "4",
      subject: "수학",
      unit: "덧셈",
    });
    assertNoPii(prompt);
  });
});
