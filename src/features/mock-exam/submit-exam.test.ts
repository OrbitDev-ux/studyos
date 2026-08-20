import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * submitExam() is the grading core of the mock-exam feature — auto-graded MC/
 * short-answer scoring, essay exclusion from the score, and wrong-answer→SRS
 * registration. No test coverage existed for any of this. Uses the codebase's
 * callback-style `prisma.$transaction(async (tx) => ...)` convention, so the
 * mock invokes the callback with a tx stub instead of resolving an array.
 */
vi.mock("server-only", () => ({}));

const { mockExam, txExamResult, txExamAnswer, transaction } = vi.hoisted(() => {
  const txExamResult = { create: vi.fn(), update: vi.fn() };
  const txExamAnswer = { create: vi.fn() };
  return {
    mockExam: { findFirst: vi.fn() },
    txExamResult,
    txExamAnswer,
    transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({ examResult: txExamResult, examAnswer: txExamAnswer }),
    ),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: { mockExam, $transaction: transaction } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { recordProblemAttempt } = vi.hoisted(() => ({ recordProblemAttempt: vi.fn() }));
vi.mock("@/features/learning/record-attempt", () => ({ recordProblemAttempt }));

const { registerWrongAnswerForReview } = vi.hoisted(() => ({
  registerWrongAnswerForReview: vi.fn(),
}));
vi.mock("@/features/review/schedule-service", () => ({ registerWrongAnswerForReview }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitExam } from "@/features/mock-exam/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };

function mcQuestion(problemId: string, correctChoiceId: string) {
  return {
    problem: {
      id: problemId,
      type: "MULTIPLE_CHOICE",
      subjectId: "s1",
      unit: null,
      difficulty: "MEDIUM",
      choices: [
        { id: correctChoiceId, isCorrect: true, content: "정답" },
        { id: "wrong-choice", isCorrect: false, content: "오답" },
      ],
    },
  };
}

let createdTotalCount = 0;

beforeEach(() => {
  vi.clearAllMocks();
  createdTotalCount = 0;
  requireCurrentUser.mockResolvedValue(USER);
  txExamResult.create.mockImplementation(({ data }: { data: { totalCount: number } }) => {
    createdTotalCount = data.totalCount;
    return Promise.resolve({ id: "result-1", totalCount: data.totalCount });
  });
  txExamAnswer.create.mockResolvedValue({});
  txExamResult.update.mockImplementation(
    ({ data }: { data: { score: number; correctCount: number } }) =>
      // Real Prisma returns the row as stored — totalCount was set at
      // create() time and isn't touched by this update.
      Promise.resolve({
        id: "result-1",
        score: data.score,
        correctCount: data.correctCount,
        totalCount: createdTotalCount,
      }),
  );
});

describe("submitExam — MC grading", () => {
  it("scores correct/incorrect MC answers and registers only the wrong one for review", async () => {
    mockExam.findFirst.mockResolvedValue({
      id: "exam-1",
      userId: "user-1",
      questions: [
        mcQuestion("p1", "correct-choice"),
        mcQuestion("p2", "correct-choice-2"),
      ],
    });

    const res = await submitExam("exam-1", {
      durationSec: 60,
      answers: [
        { problemId: "p1", choiceId: "correct-choice" }, // correct
        { problemId: "p2", choiceId: "wrong-choice" }, // incorrect
      ],
    });

    expect(res.score).toBe(50);
    expect(res.correctCount).toBe(1);
    expect(res.totalCount).toBe(2);
    expect(registerWrongAnswerForReview).toHaveBeenCalledTimes(1);
    expect(registerWrongAnswerForReview).toHaveBeenCalledWith(
      "user-1",
      "p2",
      "mock-exam",
      expect.any(Date),
      expect.anything(),
    );
    expect(recordProblemAttempt).toHaveBeenCalledTimes(2);
  });

  it("treats an unanswered question as incorrect, not a crash", async () => {
    mockExam.findFirst.mockResolvedValue({
      id: "exam-1",
      userId: "user-1",
      questions: [mcQuestion("p1", "correct-choice")],
    });

    const res = await submitExam("exam-1", { durationSec: 60, answers: [] });

    expect(res.score).toBe(0);
    expect(res.correctCount).toBe(0);
  });
});

describe("submitExam — short-answer grading is whitespace/case-insensitive", () => {
  it("normalizes both sides before comparing", async () => {
    mockExam.findFirst.mockResolvedValue({
      id: "exam-1",
      userId: "user-1",
      questions: [
        {
          problem: {
            id: "p1",
            type: "SHORT_ANSWER",
            subjectId: "s1",
            unit: null,
            difficulty: "MEDIUM",
            answerText: "Paris",
            choices: [],
          },
        },
      ],
    });

    const res = await submitExam("exam-1", {
      durationSec: 60,
      answers: [{ problemId: "p1", text: "  paris " }],
    });

    expect(res.score).toBe(100);
    expect(res.correctCount).toBe(1);
  });
});

describe("submitExam — essay questions are excluded from grading", () => {
  it("stores the essay answer but excludes it from totalCount/score and SRS/attempt logging", async () => {
    mockExam.findFirst.mockResolvedValue({
      id: "exam-1",
      userId: "user-1",
      questions: [
        mcQuestion("p1", "correct-choice"),
        {
          problem: {
            id: "p2",
            type: "ESSAY",
            subjectId: "s1",
            unit: null,
            difficulty: "MEDIUM",
            choices: [],
          },
        },
      ],
    });

    const res = await submitExam("exam-1", {
      durationSec: 60,
      answers: [
        { problemId: "p1", choiceId: "correct-choice" },
        { problemId: "p2", text: "자유 서술형 답안" },
      ],
    });

    // Only the MC question counts — 1/1 = 100, not diluted by the essay.
    expect(res.totalCount).toBe(1);
    expect(res.score).toBe(100);
    expect(recordProblemAttempt).toHaveBeenCalledTimes(1);
    expect(registerWrongAnswerForReview).not.toHaveBeenCalled();
    expect(txExamAnswer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          problemId: "p2",
          answerText: "자유 서술형 답안",
        }),
      }),
    );
  });
});

describe("submitExam — ownership", () => {
  it("throws when the exam doesn't belong to the caller (or doesn't exist)", async () => {
    mockExam.findFirst.mockResolvedValue(null);

    await expect(submitExam("exam-1", { durationSec: 0, answers: [] })).rejects.toThrow(
      "모의고사를 찾을 수 없습니다.",
    );
    expect(mockExam.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "exam-1", userId: "user-1" } }),
    );
  });
});
