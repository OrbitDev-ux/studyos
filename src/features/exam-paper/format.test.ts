import { describe, expect, it } from "vitest";
import {
  circledNumber,
  isLongPrompt,
  padQuestionNumber,
  pointsForDifficulty,
} from "@/features/exam-paper/format";

describe("exam paper format helpers", () => {
  it("maps choice index to circled numbers", () => {
    expect(circledNumber(0)).toBe("①");
    expect(circledNumber(4)).toBe("⑤");
    expect(circledNumber(9)).toBe("⑩");
    expect(circledNumber(25)).toBe("(26)"); // beyond circled range
  });

  it("derives conventional points from difficulty", () => {
    expect(pointsForDifficulty("EASY")).toBe(2);
    expect(pointsForDifficulty("MEDIUM")).toBe(3);
    expect(pointsForDifficulty("HARD")).toBe(4);
  });

  it("flags long / multi-line prompts as full-width", () => {
    expect(isLongPrompt("짧은 문제")).toBe(false);
    expect(isLongPrompt("a".repeat(200))).toBe(true);
    expect(isLongPrompt("한 줄\n두 줄\n세 줄\n네 줄")).toBe(true);
  });

  it("zero-pads answer-sheet numbers", () => {
    expect(padQuestionNumber(1)).toBe("01");
    expect(padQuestionNumber(20)).toBe("20");
  });
});
