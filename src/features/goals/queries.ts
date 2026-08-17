import { getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getTodayGoals(userId: string, timezone: string) {
  return prisma.goal.findMany({
    where: { userId, date: getZonedDateOnly(timezone) },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Goals dated within an inclusive [startDate, endDate] `@db.Date` range — used for weekly/monthly goal statistics. */
export function getGoalsInDateRange(userId: string, startDate: Date, endDate: Date) {
  return prisma.goal.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });
}
