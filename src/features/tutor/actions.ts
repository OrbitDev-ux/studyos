"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runTutorTurn, type TutorTurnMessage } from "@/features/tutor/ai";
import { tutorSubjectLabel } from "@/features/tutor/config";
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
  error?: string;
  code?: string;
  upgradePlan?: string | null;
};

/** Send a student message and get the tutor's reply. Owner-scoped; the student
 * message is persisted BEFORE the AI call so it survives an AI failure (§23). */
export async function sendTutorMessage(values: SendMessageValues): Promise<SendMessageResult> {
  const user = await requireCurrentUser();
  const parsed = sendMessageSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "메시지가 올바르지 않습니다." };
  }

  const convo = await prisma.tutorConversation.findFirst({
    where: { id: parsed.data.conversationId, userId: user.id },
    select: {
      id: true,
      subject: true,
      grade: true,
      messages: { select: { role: true, content: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!convo) return { error: "대화를 찾을 수 없습니다." };

  const history: TutorTurnMessage[] = convo.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // Persist the student's message first — preserved even if the AI call fails.
  await prisma.tutorMessage.create({
    data: { conversationId: convo.id, role: "user", content: parsed.data.content },
  });

  const res = await runTutorTurn(user, convo, history, parsed.data.content);
  if (!res.ok) {
    revalidatePath(`/tutor/${convo.id}`);
    return {
      error: "error" in res ? res.error : "선생님 답변 생성에 실패했어요.",
      code: "code" in res ? res.code : undefined,
      upgradePlan: "upgradePlan" in res ? res.upgradePlan : undefined,
    };
  }

  await prisma.tutorMessage.create({
    data: {
      conversationId: convo.id,
      role: "assistant",
      content: res.reply.reply,
      metadata: res.reply.understanding ? { understanding: res.reply.understanding } : undefined,
    },
  });
  await prisma.tutorConversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/tutor/${convo.id}`);
  return {
    reply: { content: res.reply.reply, understanding: res.reply.understanding },
  };
}

/** Delete a conversation (owner-scoped). */
export async function deleteTutorConversation(id: string): Promise<{ ok?: true }> {
  const user = await requireCurrentUser();
  await prisma.tutorConversation.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/tutor");
  return { ok: true };
}
