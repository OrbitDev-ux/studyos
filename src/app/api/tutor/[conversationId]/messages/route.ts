import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { runTutorTurnStream } from "@/features/tutor/ai";
import {
  loadConversationForTurn,
  persistAssistantReply,
  persistUserMessage,
  scheduleReviewIfRecommended,
} from "@/features/tutor/persistence";
import { streamMessageSchema } from "@/features/tutor/schema";
import { getCurrentUserOrNull } from "@/lib/session";

// The tutor AI turn runs inline in this handler; give it room past the
// default (matches /tutor/[conversationId]/page.tsx's budget — see
// TUTOR_AI_TIMEOUT_MS in features/tutor/config.ts for why the AI call itself
// stays well inside this).
export const maxDuration = 60;

type StreamEvent =
  | { type: "chunk"; text: string }
  | {
      type: "done";
      reviewScheduled?: { concept: string; count: number };
      understanding?: string;
    }
  | { type: "error"; error: string; code?: string; upgradePlan?: string | null };

/**
 * POST /api/tutor/[conversationId]/messages — streams the tutor's reply as it
 * generates (P0-3) instead of waiting for the full turn like the
 * sendTutorMessage Server Action. A Route Handler because Server Actions
 * can't hand the client an incrementally-read response — see
 * features/tutor/ai.ts#runTutorTurnStream's doc comment. sendTutorMessage()
 * stays unchanged for its other callers (the SRS→Tutor opening turn, and
 * createTutorConversation's optional first message).
 *
 * Response body is newline-delimited JSON (`application/x-ndjson`), one
 * StreamEvent per line — a plain custom framing (not SSE/EventSource) since
 * the client already reads via fetch()'s ReadableStream, not EventSource.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  // Route Handlers don't get Next's built-in Server Action origin check —
  // defense-in-depth same-origin guard for this mutating, quota-consuming POST.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 403 });
  }

  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { conversationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "메시지가 올바르지 않습니다." }, { status: 400 });
  }
  const parsed = streamMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "메시지가 올바르지 않습니다." },
      { status: 400 },
    );
  }
  const content = parsed.data.content;

  let convo;
  try {
    convo = await loadConversationForTurn(conversationId, user.id);
    if (!convo) {
      return NextResponse.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });
    }
    // Persist the student's message first — preserved even if the AI call fails.
    await persistUserMessage(convo.id, content);
  } catch (err) {
    console.error("[tutor] streaming route failed before the AI turn started", err);
    Sentry.captureException(err);
    return NextResponse.json(
      { error: "일시적인 오류가 발생했어요. 다시 시도해주세요." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Swallow enqueue failures from an already-closed controller (the
      // client disconnected) — the AI call and DB writes below still run to
      // completion regardless, so quota accounting and message history stay
      // correct even if nobody is listening anymore.
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // client gone — ignore
        }
      };

      try {
        const res = await runTutorTurnStream(
          user,
          convo,
          convo.history,
          content,
          (text) => send({ type: "chunk", text }),
        );

        if (!res.ok) {
          send({
            type: "error",
            error: "error" in res ? res.error : "선생님 답변 생성에 실패했어요.",
            code: "code" in res ? res.code : undefined,
            upgradePlan: "upgradePlan" in res ? res.upgradePlan : undefined,
          });
          return;
        }

        const reviewScheduled = await scheduleReviewIfRecommended(
          user.id,
          convo.subject,
          res.reply.reviewRecommendation,
        );
        const persisted = await persistAssistantReply(
          convo.id,
          res.reply,
          reviewScheduled,
        );
        if (!persisted.ok) {
          send({ type: "error", error: persisted.error, code: persisted.code });
          return;
        }

        send({ type: "done", reviewScheduled, understanding: res.reply.understanding });
      } catch (err) {
        console.error("[tutor] streaming turn failed unexpectedly", err);
        Sentry.captureException(err);
        send({
          type: "error",
          error: "일시적인 오류가 발생했어요. 다시 시도해주세요.",
          code: "unexpected",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
