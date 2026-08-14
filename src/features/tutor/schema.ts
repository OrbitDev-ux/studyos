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
  /**
   * Optional structured hint that the student is struggling with a concept and
   * it should be surfaced for spaced-repetition review. The AI only *proposes*
   * this; the server validates the shape (here) and scopes the effect to the
   * user's own existing wrong answers — an AI string never writes the schedule
   * directly.
   */
  reviewRecommendation: z
    .object({
      shouldSchedule: z.boolean(),
      concept: z.string().trim().min(1).max(100),
      reason: z.string().trim().max(300).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
});
export type TutorReply = z.infer<typeof tutorReplySchema>;
