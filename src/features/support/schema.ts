import { z } from "zod";
import { SUPPORT_STATUS_IDS, SUPPORT_TYPE_IDS } from "@/features/support/constants";

export const createTicketSchema = z.object({
  type: z.enum(SUPPORT_TYPE_IDS),
  title: z.string().trim().min(1, "제목을 입력해주세요").max(120, "제목은 120자 이내로 입력해주세요"),
  content: z
    .string()
    .trim()
    .min(1, "문의 내용을 입력해주세요")
    .max(5000, "문의 내용은 5000자 이내로 입력해주세요"),
});
export type CreateTicketValues = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({
  ticketId: z.string().min(1),
  content: z.string().trim().min(1, "내용을 입력해주세요").max(5000, "5000자 이내로 입력해주세요"),
});
export type TicketMessageValues = z.infer<typeof ticketMessageSchema>;

export const updateTicketStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(SUPPORT_STATUS_IDS),
});
export type UpdateTicketStatusValues = z.infer<typeof updateTicketStatusSchema>;

export const adminNoteSchema = z.object({
  ticketId: z.string().min(1),
  note: z.string().trim().max(5000, "5000자 이내로 입력해주세요"),
});
export type AdminNoteValues = z.infer<typeof adminNoteSchema>;
