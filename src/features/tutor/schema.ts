import { z } from "zod";
import { TUTOR_GRADE_IDS, TUTOR_SUBJECT_IDS } from "@/features/tutor/config";

export const createConversationSchema = z.object({
  subject: z.enum(TUTOR_SUBJECT_IDS),
  grade: z.enum(TUTOR_GRADE_IDS),
  /** Optional opening message from the student. */
  message: z.string().trim().max(4000).optional(),
});
export type CreateConversationValues = z.infer<typeof createConversationSchema>;

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().trim().min(1, "메시지를 입력해주세요").max(4000, "메시지가 너무 길어요"),
});
export type SendMessageValues = z.infer<typeof sendMessageSchema>;

/** Structured shape the AI must return (reuses generateStructured/JSON schema).
 * `reply` is markdown + LaTeX rendered by the shared <MathText>. */
export const tutorReplySchema = z.object({
  reply: z.string().min(1),
  /** Coarse read of the student's understanding, stored in message metadata. */
  understanding: z.enum(["understood", "partial", "confused", "unknown"]).optional(),
});
export type TutorReply = z.infer<typeof tutorReplySchema>;
