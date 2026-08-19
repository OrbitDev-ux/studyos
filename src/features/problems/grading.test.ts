import { describe, expect, it } from "vitest";
import { gradeAnswer, type GradableProblem } from "@/features/problems/grading";

const mcProblem: GradableProblem = {
  type: "MULTIPLE_CHOICE",
  choices: [
    { id: "a", content: "1", isCorrect: false },
    { id: "b", content: "2", isCorrect: true },
    { id: "c", content: "3", isCorrect: false },
  ],
  answerText: null,
};

const shortAnswerProblem: GradableProblem = {
  type: "SHORT_ANSWER",
  choices: [],
  answerText: "42",
};

const essayProblem: GradableProblem = {
  type: "ESSAY",
  choices: [],
  answerText: "모범 답안 예시",
};

describe("gradeAnswer — MULTIPLE_CHOICE", () => {
  it("정답 선택지를 고르면 correct: true", () => {
    expect(gradeAnswer(mcProblem, { choiceId: "b" })).toEqual({
      correct: true,
      userAnswerText: "2",
    });
  });

  it("오답 선택지를 고르면 correct: false", () => {
    expect(gradeAnswer(mcProblem, { choiceId: "a" })).toEqual({
      correct: false,
      userAnswerText: "1",
    });
  });

  it("선택지 없이 제출하면 오답으로 처리되고 크래시하지 않는다", () => {
    expect(gradeAnswer(mcProblem, {})).toEqual({ correct: false, userAnswerText: null });
  });

  it("존재하지 않는 choiceId는 오답으로 처리된다", () => {
    expect(gradeAnswer(mcProblem, { choiceId: "nope" })).toEqual({
      correct: false,
      userAnswerText: null,
    });
  });

  it("다른 문제의 choiceId를 보내도 이 문제 안에서는 매칭되지 않아 오답 처리된다", () => {
    // "z"는 mcProblem에 없는, 다른 문제의 선택지 id라고 가정.
    expect(gradeAnswer(mcProblem, { choiceId: "z" })).toEqual({
      correct: false,
      userAnswerText: null,
    });
  });
});

describe("gradeAnswer — SHORT_ANSWER", () => {
  it("정규화 후 정답과 일치하면 correct: true", () => {
    expect(gradeAnswer(shortAnswerProblem, { text: "  42 " })).toEqual({
      correct: true,
      userAnswerText: "42",
    });
  });

  it("일치하지 않으면 correct: false", () => {
    expect(gradeAnswer(shortAnswerProblem, { text: "43" })).toEqual({
      correct: false,
      userAnswerText: "43",
    });
  });

  it("빈 답안은 오답으로 처리된다", () => {
    expect(gradeAnswer(shortAnswerProblem, {})).toEqual({ correct: false, userAnswerText: null });
  });
});

describe("gradeAnswer — ESSAY", () => {
  it("selfCorrect: true → correct: true (자기채점 신뢰)", () => {
    expect(gradeAnswer(essayProblem, { text: "내 답안", selfCorrect: true })).toEqual({
      correct: true,
      userAnswerText: "내 답안",
    });
  });

  it("selfCorrect: false → correct: false", () => {
    expect(gradeAnswer(essayProblem, { text: "내 답안", selfCorrect: false })).toEqual({
      correct: false,
      userAnswerText: "내 답안",
    });
  });

  it("selfCorrect 미지정은 오답으로 안전하게 처리된다", () => {
    expect(gradeAnswer(essayProblem, { text: "내 답안" })).toEqual({
      correct: false,
      userAnswerText: "내 답안",
    });
  });
});
