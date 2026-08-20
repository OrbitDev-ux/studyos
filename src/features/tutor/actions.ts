"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runTutorTurn } from "@/features/tutor/ai";
import {
  TUTOR_SUBJECTS,
  tutorSubjectLabel,
  type TutorSubjectId,
} from "@/features/tutor/config";
import {
  loadConversationForTurn,
  persistAssistantReply,
  persistUserMessage,
  scheduleReviewIfRecommended,
} from "@/features/tutor/persistence";
import {
  createConversationSchema,
  sendMessageSchema,
  type CreateConversationValues,
  type SendMessageValues,
} from "@/features/tutor/schema";

function greeting(subjectLabel: string): string {
  return `안녕! 나는 너의 ${subjectLabel} 과외 선생님이야. 오늘은 무엇을 공부해볼까? 어려운 문제나 개념이 있으면 편하게 물어봐 😊`;
}

/** Create a conversation (with an AI greeting). Optionally sends a first message. */
export async function createTutorConversation(
  values: CreateConversationValues,
): Promise<{ conversationId?: string; error?: string }> {
  const user = await requireCurrentUser();
  const parsed = createConversationSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }
  const subjectLabel = tutorSubjectLabel(parsed.data.subject);
  const title = parsed.data.message
    ? parsed.data.message.slice(0, 30)
    : `${subjectLabel} 과외`;

  const convo = await prisma.tutorConversation.create({
    data: {
      userId: user.id,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      title,
      messages: { create: { role: "assistant", content: greeting(subjectLabel) } },
    },
    select: { id: true },
  });

  if (parsed.data.message) {
    await sendTutorMessage({ conversationId: convo.id, content: parsed.data.message });
  }
  revalidatePath("/tutor");
  return { conversationId: convo.id };
}

export type SendMessageResult = {
  reply?: { content: string; understanding?: string };
  /** Tutor→SRS: existing wrong answers on a concept surfaced for review today. */
  reviewScheduled?: { concept: string; count: number };
  error?: string;
  /** Known values include the AI-guard codes (see GenerationErrorPayload) plus
   * "persist_failed" (the AI call succeeded but saving the reply failed — `reply`
   * is still populated so the client can show it) and "unexpected" (an
   * unhandled failure elsewhere in this action). */
  code?: string;
  upgradePlan?: string | null;
};

/** Send a student message and get the tutor's reply. Owner-scoped; the student
 * message is persisted BEFORE the AI call so it survives an AI failure (§23).
 * Never throws: any unexpected failure below is caught and returned as a safe
 * {error, code:"unexpected"} so the client always has something to render.
 * requireCurrentUser() stays OUTSIDE the try below — it may throw Next's
 * "NEXT_REDIRECT" control-flow error (e.g. an expired session), which must
 * propagate untouched rather than be swallowed as a generic failure. */
export async function sendTutorMessage(
  values: SendMessageValues,
): Promise<SendMessageResult> {
  const user = await requireCurrentUser();
  const parsed = sendMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "메시지가 올바르지 않습니다." };
  }

  try {
    const convo = await loadConversationForTurn(parsed.data.conversationId, user.id);
    if (!convo) return { error: "대화를 찾을 수 없습니다." };

    // Persist the student's message first — preserved even if the AI call fails.
    await persistUserMessage(convo.id, parsed.data.content);

    const res = await runTutorTurn(user, convo, convo.history, parsed.data.content);
    if (!res.ok) {
      revalidatePath(`/tutor/${convo.id}`);
      return {
        error: "error" in res ? res.error : "선생님 답변 생성에 실패했어요.",
        code: "code" in res ? res.code : undefined,
        upgradePlan: "upgradePlan" in res ? res.upgradePlan : undefined,
      };
    }

    const reviewScheduled = await scheduleReviewIfRecommended(
      user.id,
      convo.subject,
      res.reply.reviewRecommendation,
    );

    const persisted = await persistAssistantReply(convo.id, res.reply, reviewScheduled);
    if (!persisted.ok) {
      return {
        reply: { content: res.reply.reply, understanding: res.reply.understanding },
        reviewScheduled,
        error: persisted.error,
        code: persisted.code,
      };
    }

    if (reviewScheduled) revalidatePath("/review");
    revalidatePath(`/tutor/${convo.id}`);
    return {
      reply: { content: res.reply.reply, understanding: res.reply.understanding },
      reviewScheduled,
    };
  } catch (err) {
    console.error("[tutor] sendTutorMessage failed unexpectedly", err);
    Sentry.captureException(err);
    return {
      error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
      code: "unexpected",
    };
  }
}

/**
 * SRS→Tutor: start a tutoring session seeded to review a specific due wrong
 * answer's concept. Reuses createTutorConversation (no new chat system). The
 * wrong answer must belong to the user; its subject/unit seed the session.
 */
export async function createReviewTutorConversation(
  wrongAnswerId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const user = await requireCurrentUser();
  const wrongAnswer = await prisma.wrongAnswer.findFirst({
    where: { id: wrongAnswerId, userId: user.id },
    select: { problem: { select: { unit: true, subject: { select: { name: true } } } } },
  });
  if (!wrongAnswer) return { error: "오답 기록을 찾을 수 없습니다." };

  const subjectName = wrongAnswer.problem.subject?.name ?? null;
  const unit = wrongAnswer.problem.unit ?? null;
  // Map the user's subject name onto a tutor subject; fall back to math.
  const subject: TutorSubjectId =
    TUTOR_SUBJECTS.find((s) => s.label === subjectName)?.id ?? "math";
  const message = unit
    ? `'${unit}' 개념이 아직 헷갈려요. 복습을 도와주세요.`
    : `${subjectName ?? "이 과목"} 개념을 복습하고 싶어요.`;

  return createTutorConversation({ subject, grade: "middle", message });
}

/** Delete a conversation (owner-scoped). */
export async function deleteTutorConversation(id: string): Promise<{ ok?: true }> {
  const user = await requireCurrentUser();
  await prisma.tutorConversation.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tutor");
  return { ok: true };
}
