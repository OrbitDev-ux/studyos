import { getZonedDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export function getTodayGoals(userId: string, timezone: string) {
  return prisma.goal.findMany({
    where: { userId, date: getZonedDateOnly(timezone) },
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });
}
