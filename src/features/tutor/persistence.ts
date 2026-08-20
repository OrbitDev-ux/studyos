import "server-only";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { bringForwardConceptReviews } from "@/features/review/schedule-service";
import { tutorSubjectLabel } from "@/features/tutor/config";
import type { TutorTurnMessage } from "@/features/tutor/ai";
import type { TutorReply } from "@/features/tutor/schema";

/**
 * DB access shared between the sendTutorMessage Server Action (non-streaming —
 * used by createTutorConversation's optional first message and the SRS→Tutor
 * opening turn) and the /api/tutor/[conversationId]/messages Route Handler
 * (streaming — see features/tutor/ai.ts#runTutorTurnStream). Extracted so both
 * paths share one implementation of "load/persist a turn" instead of drifting.
 */

export type LoadedConversation = {
  id: string;
  subject: string;
  grade: string;
  history: TutorTurnMessage[];
};

/** Owner-scoped conversation load, shaped for runTutorTurn(Stream). Returns
 * null if the conversation doesn't exist or belongs to another user. */
export async function loadConversationForTurn(
  conversationId: string,
  userId: string,
): Promise<LoadedConversation | null> {
  const convo = await prisma.tutorConversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      subject: true,
      grade: true,
      messages: { select: { role: true, content: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) return null;
  return {
    id: convo.id,
    subject: convo.subject,
    grade: convo.grade,
    history: convo.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  };
}

/** Persists the student's message BEFORE the AI call so it survives an AI
 * failure — the caller decides how to handle a failure here. */
export function persistUserMessage(
  conversationId: string,
  content: string,
): Promise<unknown> {
  return prisma.tutorMessage.create({
    data: { conversationId, role: "user", content },
  });
}

/**
 * Tutor→SRS: if the AI proposes a review and the recommendation validates,
 * surface the user's OWN matching wrong answers for review today. Non-fatal by
 * design — this is a nice-to-have side effect and must never block the
 * tutor's reply from being saved and shown.
 */
export async function scheduleReviewIfRecommended(
  userId: string,
  subjectId: string,
  rec: TutorReply["reviewRecommendation"],
): Promise<{ concept: string; count: number } | undefined> {
  if (!rec?.shouldSchedule) return undefined;
  try {
    const count = await bringForwardConceptReviews(
      userId,
      tutorSubjectLabel(subjectId),
      rec.concept,
    );
    return count > 0 ? { concept: rec.concept, count } : undefined;
  } catch (err) {
    console.error("[tutor] bringForwardConceptReviews failed (non-fatal)", err);
    Sentry.captureException(err);
    return undefined;
  }
}

export type PersistReplyResult =
  { ok: true } | { ok: false; error: string; code: "persist_failed" };

/**
 * Persists the assistant's reply + bumps the conversation timestamp. Never
 * throws — by the time this runs, the AI call already succeeded (and
 * consumed quota), so a DB failure here is reported as a distinct
 * "persist_failed" outcome instead of losing the reply the student already
 * has (the caller still has `reply` in hand and can show it regardless).
 */
export async function persistAssistantReply(
  conversationId: string,
  reply: TutorReply,
  reviewScheduled: { concept: string; count: number } | undefined,
): Promise<PersistReplyResult> {
  try {
    await prisma.tutorMessage.create({
      data: {
        conversationId,
        role: "assistant",
        content: reply.reply,
        metadata:
          reply.understanding || reviewScheduled
            ? { understanding: reply.understanding, reviewScheduled }
            : undefined,
      },
    });
    await prisma.tutorConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    console.error(
      "[tutor] failed to persist assistant reply after a successful AI call",
      err,
    );
    Sentry.captureException(err);
    return {
      ok: false,
      error: "답변이 저장되지 않았어요. 새로고침하면 사라질 수 있어요.",
      code: "persist_failed",
    };
  }
}
