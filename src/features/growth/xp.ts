import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * XP source types — a plain string union (not a Postgres enum), matching
 * this schema's convention for fields expected to grow (see
 * StudySession.type, Friendship.status): a new XP source is a TS change,
 * never a migration.
 */
export type XpType =
  | "MISSION_COMPLETED"
  | "STUDY_TIME"
  | "REVIEW_COMPLETED"
  | "PROBLEM_SOLVED"
  | "GOAL_COMPLETED"
  | "ALL_MISSIONS_BONUS";

/** Base XP policy. MISSION_COMPLETED's actual amount comes from the
 * individual mission's own `xpReward` (captured at creation) instead of this
 * table — see features/growth/mission-progress.ts. STUDY_TIME scales with
 * real studied minutes via studyTimeXp() below rather than a flat amount. */
export const XP_AMOUNTS = {
  REVIEW_COMPLETED: 10,
  PROBLEM_SOLVED: 2,
  GOAL_COMPLETED: 30,
  ALL_MISSIONS_BONUS: 100,
} as const satisfies Partial<Record<XpType, number>>;

const STUDY_TIME_XP_PER_CHUNK = 20;
const STUDY_TIME_CHUNK_SECONDS = 30 * 60;

/** +20 XP per full 30-minute chunk of a study session — floor-based so a
 * 1-minute session earns 0 (no reward for near-instant farming) while real
 * accumulated time scales proportionally. */
export function studyTimeXp(durationSec: number): number {
  return Math.floor(Math.max(0, durationSec) / STUDY_TIME_CHUNK_SECONDS) * STUDY_TIME_XP_PER_CHUNK;
}

export type AwardXpInput = {
  userId: string;
  type: XpType;
  amount: number;
  /**
   * MUST uniquely identify the one real-world activity this XP is for (see
   * the GrowthXpEvent doc comment in schema.prisma) — this is the entire
   * idempotency guarantee. Never derive it from client input; always from a
   * server-owned id (a row id, or a deterministic "<id>:<date>" key).
   */
  sourceId: string;
  metadata?: Record<string, unknown>;
};

export type AwardXpResult = {
  /** false when this exact (userId, type, sourceId) was already awarded —
   * a safe no-op, not an error, so callers can call this unconditionally. */
  awarded: boolean;
  totalXp: number;
};

function isDuplicateSourceError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Grants XP exactly once per (userId, type, sourceId) — the GrowthXpEvent
 * unique constraint is the actual enforcement; this function just reacts to
 * it safely instead of racing a check-then-insert. Never called with a
 * client-supplied amount (every call site passes a server-computed constant
 * or a value derived from server-verified data, e.g. studyTimeXp(durationSec)
 * from the server's own measured duration).
 *
 * Pass `tx` when this must be atomic with other writes in a caller's own
 * transaction (e.g. mission completion); omit it to run standalone, in which
 * case this wraps its own two writes (the ledger row + the cached total) in
 * one transaction so they can never drift apart.
 */
export async function awardXp(
  input: AwardXpInput,
  tx?: Prisma.TransactionClient,
): Promise<AwardXpResult> {
  const run = async (client: Prisma.TransactionClient | typeof prisma): Promise<AwardXpResult> => {
    try {
      await client.growthXpEvent.create({
        data: {
          userId: input.userId,
          type: input.type,
          amount: input.amount,
          sourceId: input.sourceId,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      if (isDuplicateSourceError(err)) {
        const growth = await client.userGrowth.findUnique({ where: { userId: input.userId } });
        return { awarded: false, totalXp: growth?.totalXp ?? 0 };
      }
      throw err;
    }

    const growth = await client.userGrowth.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, totalXp: input.amount },
      update: { totalXp: { increment: input.amount } },
    });
    return { awarded: true, totalXp: growth.totalXp };
  };

  if (tx) return run(tx);
  return prisma.$transaction((txClient) => run(txClient));
}
