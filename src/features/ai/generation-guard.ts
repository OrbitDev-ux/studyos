import "server-only";
import { z } from "zod";
import { getMonthStart, getTodayRange } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { assertQuestionCount, InvalidCountError } from "@/features/ai/generation-limits";
import type { AccessState } from "@/features/billing/subscription";
import {
  getFeatureLimit,
  getUsageWindow,
  upgradePlanLabel,
  type Limit,
  type MeteredFeature,
} from "@/features/billing/entitlements";

/**
 * Server-side AI cost + plan protection. Every AI generation goes through
 * withGenerationQuota(): it reserves a slot behind a per-user Postgres advisory
 * lock (concurrent requests can't both pass the gate — race-condition safe),
 * runs the AI work, then records the outcome.
 *
 * The numeric cap now comes from the caller's resolved plan/trial entitlement
 * (features/billing), per feature and per window:
 *   - AI problem generation → daily limit (TRIAL 10 / PRO 50 / PREMIUM ∞)
 *   - Mock-exam generation → TRIAL: whole-trial limit (2); PRO: monthly (10);
 *     PREMIUM: unlimited.
 * Counts are per `kind` (problem vs mock-exam never share a budget). Even an
 * "unlimited" plan keeps the perMinute + concurrency ABUSE guards.
 *
 * Accounting: only `success` rows (plus still-live `pending` reservations)
 * consume the limit, so validation/AI errors don't burn a user's budget; the
 * perMinute window counts all recent attempts of that kind to throttle storms.
 *
 * No Redis: the advisory *transaction* lock releases at COMMIT and the txn is
 * short (never wraps the Gemini call); it works behind PgBouncer txn pooling.
 */

export type GenerationKind = "problem" | "mock-exam" | "study-book";

/** Transient guards (independent of plan) — abuse protection for every plan. */
const ABUSE_PER_MINUTE = 6;
const ABUSE_CONCURRENT = 1;
// A reservation older than this is treated as dead (crashed before finalizing).
const STALE_PENDING_MS = 2 * 60 * 1000;

export type QuotaErrorCode = "rate" | "concurrent";

export class QuotaError extends Error {
  code: QuotaErrorCode;
  constructor(code: QuotaErrorCode, message: string) {
    super(message);
    this.name = "QuotaError";
    this.code = code;
  }
}

/** Plan/trial limit reached — structured so the API/UI can show upgrade info. */
export class FeatureLimitError extends Error {
  readonly code = "FEATURE_LIMIT_REACHED" as const;
  feature: MeteredFeature;
  limit: number;
  used: number;
  constructor(feature: MeteredFeature, limit: number, used: number, message: string) {
    super(message);
    this.name = "FeatureLimitError";
    this.feature = feature;
    this.limit = limit;
    this.used = used;
  }
}

export function kindToFeature(kind: GenerationKind): MeteredFeature {
  switch (kind) {
    case "problem":
      return "AI_PROBLEM_GENERATION";
    case "mock-exam":
      return "MOCK_EXAM_GENERATION";
    case "study-book":
      return "STUDY_BOOK_GENERATION";
  }
}

/** Structured, client-safe payload for a generation rejection (or null if the
 * error is not a quota/limit rejection and should propagate as a real failure). */
export type GenerationErrorPayload = {
  error: string;
  code: "FEATURE_LIMIT_REACHED" | "rate" | "concurrent" | "invalid_count";
  feature?: MeteredFeature;
  limit?: number;
  used?: number;
  upgradePlan?: string | null;
};

export function generationErrorPayload(err: unknown): GenerationErrorPayload | null {
  if (err instanceof InvalidCountError) {
    return { error: err.message, code: err.code };
  }
  if (err instanceof FeatureLimitError) {
    return {
      error: err.message,
      code: err.code,
      feature: err.feature,
      limit: err.limit,
      used: err.used,
      upgradePlan: upgradePlanLabel(err.feature),
    };
  }
  if (err instanceof QuotaError) {
    return { error: err.message, code: err.code };
  }
  return null;
}

/**
 * The start instant of the usage window for this state+kind (null = unlimited,
 * skip counting). "trial" counts from trialStartedAt (whole trial).
 */
export function usageWindowStart(
  state: AccessState,
  kind: GenerationKind,
  ctx: { timezone: string; trialStartedAt: Date | null },
  now: Date = new Date(),
): Date | null {
  const window = getUsageWindow(state, kindToFeature(kind));
  switch (window) {
    case "day":
      return getTodayRange(ctx.timezone, now).start;
    case "month":
      return getMonthStart(ctx.timezone, now);
    case "trial":
      // From trial start; fall back to epoch so all history counts.
      return ctx.trialStartedAt ?? new Date(0);
    case "unlimited":
    default:
      return null;
  }
}

/** Count successful generations of `kind` since `windowStart` (used for API too). */
export function countGenerationUsage(
  userId: string,
  kind: GenerationKind,
  windowStart: Date,
): Promise<number> {
  return prisma.aiGenerationLog.count({
    where: { userId, kind, status: "success", createdAt: { gte: windowStart } },
  });
}

type ReserveContext = {
  userId: string;
  timezone: string;
  ip: string | null;
  kind: GenerationKind;
  count: number;
  /** Resolved plan/trial access state (server-authoritative). */
  state: AccessState;
  /** Trial anchor for the "whole trial" mock-exam window; null if unknown. */
  trialStartedAt: Date | null;
};

async function reserveGeneration(ctx: ReserveContext): Promise<string> {
  // Central question-count ceiling (defense-in-depth). Rejects invalid/oversized
  // requests before any reservation or AI call, even if a caller skipped the form
  // schema. Per-surface schemas may cap lower; this is the global backstop.
  assertQuestionCount(ctx.count);

  const feature = kindToFeature(ctx.kind);
  const limit: Limit = getFeatureLimit(ctx.state, feature);
  const windowStart = usageWindowStart(ctx.state, ctx.kind, ctx, new Date());

  return prisma.$transaction(async (tx) => {
    // Serialize check-and-reserve for THIS user so two concurrent requests can't
    // both pass. Released at COMMIT (short txn; the AI call runs after).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ctx.userId}))`;

    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60_000);
    const staleCutoff = new Date(now.getTime() - STALE_PENDING_MS);

    const [usedInWindow, livePending, lastMinute] = await Promise.all([
      // Only count this kind, since window may be null (unlimited) → 0.
      windowStart
        ? tx.aiGenerationLog.count({
            where: {
              userId: ctx.userId,
              kind: ctx.kind,
              OR: [
                { status: "success", createdAt: { gte: windowStart } },
                { status: "pending", createdAt: { gte: staleCutoff } },
              ],
            },
          })
        : Promise.resolve(0),
      tx.aiGenerationLog.count({
        where: {
          userId: ctx.userId,
          kind: ctx.kind,
          status: "pending",
          createdAt: { gte: staleCutoff },
        },
      }),
      tx.aiGenerationLog.count({
        where: { userId: ctx.userId, kind: ctx.kind, createdAt: { gte: minuteAgo } },
      }),
    ]);

    // Abuse guards apply to every plan (even unlimited).
    if (livePending >= ABUSE_CONCURRENT) {
      throw new QuotaError(
        "concurrent",
        "이미 생성 중이에요. 잠시 후 다시 시도해주세요.",
      );
    }
    if (lastMinute >= ABUSE_PER_MINUTE) {
      throw new QuotaError("rate", "요청이 너무 잦아요. 잠시 후 다시 시도해주세요.");
    }

    // Plan/trial numeric limit (skipped when unlimited).
    if (limit !== null && usedInWindow >= limit) {
      throw new FeatureLimitError(
        feature,
        limit,
        usedInWindow,
        `사용 한도(${limit}회)를 모두 사용했어요.`,
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
  return err instanceof z.ZodError ? "validation_failed" : "error";
}

async function finalizeGeneration(
  logId: string,
  status: "success" | "validation_failed" | "error",
): Promise<void> {
  await prisma.aiGenerationLog
    .update({ where: { id: logId }, data: { status } })
    .catch(() => {});
}

/**
 * Run `fn` under quota/plan protection. Reserves a slot first (throwing
 * FeatureLimitError / QuotaError before any AI call), then records the outcome.
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
