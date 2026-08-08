import "server-only";
import { z } from "zod";
import { getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { limitsForEmail } from "@/features/ai/quota";

/**
 * Server-side AI cost protection. Every AI generation must go through
 * withGenerationQuota(): it reserves a slot behind a per-user Postgres advisory
 * lock (so concurrent requests can't both pass the gate — race-condition safe),
 * runs the AI work, then records the outcome.
 *
 * Quota accounting policy (explicit):
 *  - Only `success` rows (plus still-live `pending` reservations) consume the
 *    DAILY quota → validation failures and server/AI errors do NOT burn a user's
 *    daily budget.
 *  - The per-minute RATE limit counts ALL attempts in the window (any outcome)
 *    → repeated failures still get throttled, preventing retry storms.
 *  - CONCURRENCY counts live `pending` reservations → one in-flight generation
 *    at a time (per policy), which also collapses double-clicks into one call.
 *  - A crashed/abandoned reservation stops counting after STALE_PENDING_MS so a
 *    lost request never permanently wedges a user's quota.
 *
 * No Redis: the advisory *transaction* lock is released at COMMIT and the txn is
 * short (it never wraps the 30s Gemini call), and it works behind PgBouncer
 * transaction pooling. This is the infra-appropriate lock for this stack.
 */

export type GenerationKind = "problem" | "mock-exam";

export type QuotaErrorCode = "daily" | "rate" | "concurrent";

export class QuotaError extends Error {
  code: QuotaErrorCode;
  constructor(code: QuotaErrorCode, message: string) {
    super(message);
    this.name = "QuotaError";
    this.code = code;
  }
}

// A reservation older than this is treated as dead (the request crashed before
// finalizing) — it stops blocking concurrency and stops counting toward daily.
const STALE_PENDING_MS = 2 * 60 * 1000;

type ReserveContext = {
  userId: string;
  email: string;
  timezone: string;
  ip: string | null;
  kind: GenerationKind;
  /** Number of items requested (for observability only). */
  count: number;
};

/**
 * Atomically check quota and, if allowed, insert a `pending` reservation row.
 * Throws QuotaError (before any AI call) when a limit is hit. Returns the
 * reservation id to finalize later.
 */
async function reserveGeneration(ctx: ReserveContext): Promise<string> {
  const limits = await limitsForEmail(ctx.email);

  return prisma.$transaction(async (tx) => {
    // Serialize the check-and-reserve for THIS user. Two concurrent requests
    // queue here; the second sees the first's pending row and is rejected.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ctx.userId}))`;

    const now = new Date();
    const { start: dayStart } = getTodayRange(ctx.timezone);
    const minuteAgo = new Date(now.getTime() - 60_000);
    const staleCutoff = new Date(now.getTime() - STALE_PENDING_MS);

    const [successToday, livePending, lastMinute] = await Promise.all([
      tx.aiGenerationLog.count({
        where: { userId: ctx.userId, status: "success", createdAt: { gte: dayStart } },
      }),
      tx.aiGenerationLog.count({
        where: { userId: ctx.userId, status: "pending", createdAt: { gte: staleCutoff } },
      }),
      tx.aiGenerationLog.count({
        where: { userId: ctx.userId, createdAt: { gte: minuteAgo } },
      }),
    ]);

    if (livePending >= limits.concurrent) {
      throw new QuotaError(
        "concurrent",
        "이미 문제를 생성하고 있어요. 잠시 후 다시 시도해주세요.",
      );
    }
    if (lastMinute >= limits.perMinute) {
      throw new QuotaError(
        "rate",
        "요청이 너무 잦아요. 잠시 후 다시 시도해주세요.",
      );
    }
    if (successToday + livePending >= limits.daily) {
      throw new QuotaError(
        "daily",
        `오늘 사용할 수 있는 AI 생성 횟수(${limits.daily}회)를 모두 사용했어요. 내일 다시 시도해주세요.`,
      );
    }

    const log = await tx.aiGenerationLog.create({
      data: {
        userId: ctx.userId,
        ip: ctx.ip,
        kind: ctx.kind,
        status: "pending",
        count: ctx.count,
      },
    });
    return log.id;
  });
}

function outcomeFor(err: unknown): "validation_failed" | "error" {
  // A Zod failure means the AI returned a malformed/off-schema payload.
  return err instanceof z.ZodError ? "validation_failed" : "error";
}

async function finalizeGeneration(
  logId: string,
  status: "success" | "validation_failed" | "error",
): Promise<void> {
  // Never let bookkeeping failure mask the real result; best-effort update.
  await prisma.aiGenerationLog
    .update({ where: { id: logId }, data: { status } })
    .catch(() => {});
}

/**
 * Run `fn` (the actual AI generation + persistence) under quota protection.
 * Reserves a slot first (throwing QuotaError if over limit — no AI call made),
 * then records success / validation_failed / error based on the outcome.
 */
export async function withGenerationQuota<T>(
  ctx: ReserveContext,
  fn: () => Promise<T>,
): Promise<T> {
  const logId = await reserveGeneration(ctx);
  try {
    const result = await fn();
    await finalizeGeneration(logId, "success");
    return result;
  } catch (err) {
    await finalizeGeneration(logId, outcomeFor(err));
    throw err;
  }
}
