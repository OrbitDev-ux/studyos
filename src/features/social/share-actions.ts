"use server";

import { revalidatePath } from "next/cache";
import { IMPORT_SOURCE } from "@/features/problems/import/types";
import { createConversationMessage } from "@/features/social/message-service";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

const SHARE_PICKER_LIMIT = 20;

/**
 * Recent problems the current user can share into a chat — their own AI-
 * generated problems plus the shared 문제은행 (same ownership/access rule
 * generateSimilarProblem already uses), narrowed to preview-safe fields only
 * (no choices/isCorrect/answerText — a share must not hand the recipient the
 * answer before they've solved it themselves).
 */
export async function getShareableProblems(query: string) {
  const user = await requireCurrentUser();
  const q = query.trim();

  const problems = await prisma.problem.findMany({
    where: {
      OR: [{ userId: user.id }, { source: IMPORT_SOURCE }],
      ...(q ? { prompt: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      prompt: true,
      type: true,
      difficulty: true,
      subject: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
    take: SHARE_PICKER_LIMIT,
  });
  return problems;
}

/**
 * Shares a problem into a DM as its own message. Ownership/access is
 * re-verified here (never trust that a client-shown "share" button was only
 * ever wired to problems the user can actually see) — same rule as
 * getShareableProblems and generateSimilarProblem.
 */
export async function shareProblem(conversationId: string, problemId: string, caption = "") {
  const user = await requireCurrentUser();

  const problem = await prisma.problem.findFirst({
    where: { id: problemId, OR: [{ userId: user.id }, { source: IMPORT_SOURCE }] },
    select: { id: true },
  });
  if (!problem) throw new Error("문제를 찾을 수 없습니다.");

  await createConversationMessage(user, conversationId, {
    content: caption,
    sharedType: "PROBLEM",
    sharedId: problem.id,
    notificationPreview: () => "📚 문제를 공유했어요",
  });

  revalidatePath(`/social/${conversationId}`);
  revalidatePath("/social");
}
