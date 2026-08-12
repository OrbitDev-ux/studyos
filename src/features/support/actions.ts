"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  createTicketSchema,
  ticketMessageSchema,
  type CreateTicketValues,
  type TicketMessageValues,
} from "@/features/support/schema";

/** Create a ticket + its first message. Returns the new ticket id. */
export async function createTicket(
  values: CreateTicketValues,
): Promise<{ ticketId?: string; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = createTicketSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      status: "OPEN",
      // The user has seen their own opening message.
      userLastReadAt: new Date(),
      messages: {
        create: { authorRole: "user", senderId: user.id, content: parsed.data.content },
      },
    },
    select: { id: true },
  });

  revalidatePath("/support");
  return { ticketId: ticket.id };
}

/** Append a user reply to their OWN ticket (ownership enforced server-side). */
export async function addUserMessage(
  values: TicketMessageValues,
): Promise<{ ok?: true; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = ticketMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  // Ownership + not-closed check in one guarded query.
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: parsed.data.ticketId, userId: user.id },
    select: { id: true, status: true },
  });
  if (!ticket) return { error: "문의를 찾을 수 없습니다." };
  if (ticket.status === "CLOSED") return { error: "종료된 문의에는 답변할 수 없습니다." };

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorRole: "user", senderId: user.id, content: parsed.data.content },
    }),
    // A user reply reopens waiting; bump updatedAt + mark user as caught up.
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: ticket.status === "ANSWERED" ? "IN_PROGRESS" : ticket.status,
        userLastReadAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/support/${ticket.id}`);
  revalidatePath("/support");
  return { ok: true };
}

/** Mark a ticket as read by its owner (clears the "새 답변" notification). */
export async function markTicketRead(ticketId: string): Promise<void> {
  const user = await requireCurrentUser();
  await prisma.supportTicket.updateMany({
    where: { id: ticketId, userId: user.id },
    data: { userLastReadAt: new Date() },
  });
}
