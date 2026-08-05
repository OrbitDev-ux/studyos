import { getTodayRange, getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getTodayTodoCounts(userId: string, timezone: string) {
  const date = getZonedDateOnly(timezone);
  return prisma.todo.groupBy({
    by: ["completed"],
    where: { userId, dueDate: date },
    _count: { _all: true },
  });
}

export async function getTodaySubjectBreakdown(userId: string, timezone: string) {
  const { start, end } = getTodayRange(timezone);

  const sessions = await prisma.studySession.groupBy({
    by: ["subjectId"],
    where: { userId, startedAt: { gte: start, lt: end } },
    _sum: { durationSec: true },
  });

  const subjectIds = sessions
    .map((s) => s.subjectId)
    .filter((id): id is string => id !== null);
  const subjects = await prisma.subject.findMany({ where: { id: { in: subjectIds } } });
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return sessions
    .map((s) => ({
      subject: s.subjectId ? (subjectById.get(s.subjectId) ?? null) : null,
      seconds: s._sum.durationSec ?? 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}
