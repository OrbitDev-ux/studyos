import "server-only";
import type { Prisma, SupportTicketStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

/** Admin ticket list with status filter + title search. */
export async function getAdminTickets(opts: {
  status?: SupportTicketStatus;
  q?: string;
  page?: number;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const where: Prisma.SupportTicketWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.q ? { title: { contains: opts.q, mode: "insensitive" } } : {}),
  };
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.supportTicket.count({ where }),
  ]);
  return { tickets, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), page };
}

/** Count of tickets needing attention (OPEN / IN_PROGRESS) for the admin nav badge. */
export function getOpenTicketCount(): Promise<number> {
  return prisma.supportTicket.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
}

/** Full ticket for admins: thread + user identity + internal adminNote. */
export function getAdminTicket(ticketId: string) {
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      messages: {
        select: { id: true, authorRole: true, content: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
