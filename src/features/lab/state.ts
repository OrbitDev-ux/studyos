import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LAB_FEATURE_KEYS } from "@/features/lab/registry";

export type LabFeatureRuntime = {
  enabled: boolean;
  impressions: number;
  uses: number;
  successes: number;
  failures: number;
  /** Last state change (toggle or counter bump); null when never configured. */
  updatedAt: Date | null;
};

const DEFAULT_RUNTIME: LabFeatureRuntime = {
  enabled: true,
  impressions: 0,
  uses: 0,
  successes: 0,
  failures: 0,
  updatedAt: null,
};

/** key → runtime state; a missing DB row defaults to enabled with zero counters. */
export async function getLabFeatureStates(): Promise<Map<string, LabFeatureRuntime>> {
  const rows = await prisma.labFeatureState.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const map = new Map<string, LabFeatureRuntime>();
  for (const key of LAB_FEATURE_KEYS) {
    const r = byKey.get(key);
    map.set(
      key,
      r
        ? {
            enabled: r.enabled,
            impressions: r.impressions,
            uses: r.uses,
            successes: r.successes,
            failures: r.failures,
            updatedAt: r.updatedAt,
          }
        : { ...DEFAULT_RUNTIME },
    );
  }
  return map;
}

export async function isLabFeatureEnabled(key: string): Promise<boolean> {
  const row = await prisma.labFeatureState.findUnique({
    where: { key },
    select: { enabled: true },
  });
  return row ? row.enabled : true; // default-enabled when unconfigured
}

type CounterField = "impressions" | "uses" | "successes" | "failures";

/** Best-effort analytics increment — never throws into a feature run. */
export async function bumpLabCounter(key: string, field: CounterField, by = 1): Promise<void> {
  const create = { key, [field]: by } as Prisma.LabFeatureStateCreateInput;
  const update = { [field]: { increment: by } } as Prisma.LabFeatureStateUpdateInput;
  await prisma.labFeatureState.upsert({ where: { key }, create, update }).catch(() => {});
}

export async function setLabFeatureEnabled(key: string, enabled: boolean): Promise<void> {
  await prisma.labFeatureState.upsert({
    where: { key },
    create: { key, enabled },
    update: { enabled },
  });
}

export type FeedbackCounts = { likes: number; dislikes: number };

export async function getFeedbackCounts(): Promise<Map<string, FeedbackCounts>> {
  const grouped = await prisma.labFeedback.groupBy({
    by: ["featureKey", "vote"],
    _count: { _all: true },
  });
  const map = new Map<string, FeedbackCounts>();
  for (const key of LAB_FEATURE_KEYS) map.set(key, { likes: 0, dislikes: 0 });
  for (const g of grouped) {
    const c = map.get(g.featureKey) ?? { likes: 0, dislikes: 0 };
    if (g.vote === "LIKE") c.likes = g._count._all;
    else c.dislikes = g._count._all;
    map.set(g.featureKey, c);
  }
  return map;
}

export async function getUserVotes(userId: string): Promise<Map<string, "LIKE" | "DISLIKE">> {
  const rows = await prisma.labFeedback.findMany({
    where: { userId },
    select: { featureKey: true, vote: true },
  });
  return new Map(rows.map((r) => [r.featureKey, r.vote]));
}
