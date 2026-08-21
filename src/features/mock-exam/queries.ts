import { prisma } from "@/lib/prisma";

export function getMockExams(userId: string) {
  return prisma.mockExam.findMany({
    where: { userId },
    include: {
      subject: true,
      results: { orderBy: { submittedAt: "desc" }, take: 1 },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Small "recently created" slice with each exam's latest attempt, for the dashboard card. */
export function getRecentMockExams(userId: string, limit: number) {
  return prisma.mockExam.findMany({
    where: { userId },
    include: {
      results: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Fetched BEFORE the exam is taken (take-exam-view / the printable paper), so
 * `choices` must never include `isCorrect` here — that would ship the answer
 * key to the client before submission. Post-submission review (getExamResult
 * below) is a separate query and legitimately includes it.
 */
export function getMockExam(examId: string, userId: string) {
  return prisma.mockExam.findFirst({
    where: { id: examId, userId },
    include: {
      subject: true,
      questions: {
        include: {
          problem: {
            include: {
              choices: { select: { id: true, label: true, content: true } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });
}

export function getExamResult(examId: string, userId: string, resultId?: string) {
  return prisma.examResult.findFirst({
    where: resultId ? { id: resultId, examId, userId } : { examId, userId },
    orderBy: resultId ? undefined : { submittedAt: "desc" },
    include: {
      exam: {
        include: {
          questions: { orderBy: { order: "asc" }, select: { problemId: true } },
        },
      },
      answers: {
        include: { problem: { include: { choices: true } }, selectedChoice: true },
      },
    },
  });
}
