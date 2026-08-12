"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/admin/context";
import { prisma } from "@/lib/prisma";
import {
  adminNoteSchema,
  ticketMessageSchema,
  updateTicketStatusSchema,
  type AdminNoteValues,
  type TicketMessageValues,
  type UpdateTicketStatusValues,
} from "@/features/support/schema";

/** Post an admin reply. Sets status to ANSWERED and revalidates both views. */
export async function replyToTicket(
  values: TicketMessageValues,
): Promise<{ ok?: true; error?: string }> {
  await requireCapability("manageSupport");
  const parsed = ticketMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true },
  });
  if (!ticket) return { error: "문의를 찾을 수 없습니다." };

  await prisma.$transaction([
    prisma.supportMessage.create({
      // Admin messages have no User senderId (admins live in AdminUser).
      data: { ticketId: ticket.id, authorRole: "admin", content: parsed.data.content },
    }),
    prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "ANSWERED" } }),
  ]);

  revalidatePath(`/admin/support/${ticket.id}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

export async function updateTicketStatus(
  values: UpdateTicketStatusValues,
): Promise<{ ok?: true; error?: string }> {
  await requireCapability("manageSupport");
  const parsed = updateTicketStatusSchema.safeParse(values);
  if (!parsed.success) return { error: "상태 값이 올바르지 않습니다." };

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: { status: parsed.data.status },
  });
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

/** Internal admin memo — never exposed to the user. */
export async function updateAdminNote(
  values: AdminNoteValues,
): Promise<{ ok?: true; error?: string }> {
  await requireCapability("manageSupport");
  const parsed = adminNoteSchema.safeParse(values);
  if (!parsed.success) return { error: "메모가 너무 깁니다." };

  await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: { adminNote: parsed.data.note || null },
  });
  revalidatePath(`/admin/support/${parsed.data.ticketId}`);
  return { ok: true };
}
