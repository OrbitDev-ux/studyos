import { getRecentDateOnlyRange, getRecentRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getLatestAiAnalysis(userId: string, type: "weakness" | "weekly-report") {
  return prisma.aiAnalysis.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  });
}

const WEAKNESS_SOURCE_LIMIT = 30;

export async function getWeaknessSourceData(userId: string) {
  const wrongAnswers = await prisma.wrongAnswer.findMany({
    where: { userId, resolved: false },
    include: { problem: { include: { subject: true } } },
    orderBy: { createdAt: "desc" },
    take: WEAKNESS_SOURCE_LIMIT,
  });

  return wrongAnswers.map((wrongAnswer) => ({
    subject: wrongAnswer.problem.subject?.name ?? "미지정",
    unit: wrongAnswer.problem.unit,
    prompt: wrongAnswer.problem.prompt,
  }));
}

const REPORT_WINDOW_DAYS = 7;

export async function getWeeklyReportSourceData(userId: string, timezone: string) {
  const { start, end } = getRecentRange(timezone, REPORT_WINDOW_DAYS);
  // Todo.dueDate is a @db.Date column — must use date-only bounds, not the
  // instant range above (see getRecentDateOnlyRange's doc comment).
  const { startDate, endDate } = getRecentDateOnlyRange(timezone, REPORT_WINDOW_DAYS);

  const [studySessions, todosCompleted, examResults] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId, startedAt: { gte: start, lt: end } },
      include: { subject: true },
    }),
    prisma.todo.count({
      where: { userId, completed: true, dueDate: { gte: startDate, lte: endDate } },
    }),
    prisma.examResult.findMany({
      where: { userId, submittedAt: { gte: start, lt: end } },
      select: { score: true },
    }),
  ]);

  const totalStudySeconds = studySessions.reduce((sum, s) => sum + s.durationSec, 0);

  const secondsBySubject = new Map<string, number>();
  for (const session of studySessions) {
    const name = session.subject?.name ?? "미지정";
    secondsBySubject.set(name, (secondsBySubject.get(name) ?? 0) + session.durationSec);
  }

  const averageExamScore =
    examResults.length > 0
      ? Math.round(examResults.reduce((sum, r) => sum + r.score, 0) / examResults.length)
      : null;

  return {
    totalStudySeconds,
    subjectBreakdown: Array.from(secondsBySubject.entries()).map(([name, seconds]) => ({
      name,
      seconds,
    })),
    todosCompleted,
    examCount: examResults.length,
    averageExamScore,
  };
}
