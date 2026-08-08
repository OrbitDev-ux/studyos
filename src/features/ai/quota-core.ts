import { z } from "zod";

/**
 * Pure AI-quota core — policy shape, defaults, and tier classification with no
 * DB/imports, so it is fully unit-testable (mirrors the weakness-compute vs
 * weakness split). The DB-backed reader (admin override) lives in quota.ts.
 *
 * Tiers:
 *  - guest : throwaway `*@guest.studyos.app` accounts (see auth/actions.ts)
 *  - tester: emails in AI_TESTER_EMAILS (comma-separated env) — higher, still finite
 *  - user  : every other signed-in account
 *
 * There is intentionally NO unlimited tier: even testers get a finite (large)
 * budget, so a leaked/abused account can never rack up unbounded Gemini cost.
 */
export type QuotaTier = "guest" | "user" | "tester";

export type TierLimits = {
  /** Max successful generations per calendar day (user's timezone). */
  daily: number;
  /** Max generation requests per rolling 60s window (any outcome). */
  perMinute: number;
  /** Max simultaneously-running generations. */
  concurrent: number;
};

export type QuotaPolicy = Record<QuotaTier, TierLimits>;

/** Code-default policy; the initial spec values. Admin can override via SETTING. */
export const DEFAULT_QUOTA_POLICY: QuotaPolicy = {
  guest: { daily: 5, perMinute: 1, concurrent: 1 },
  user: { daily: 20, perMinute: 3, concurrent: 1 },
  tester: { daily: 200, perMinute: 10, concurrent: 2 },
};

const tierLimitsSchema = z.object({
  daily: z.number().int().min(0),
  perMinute: z.number().int().min(1),
  concurrent: z.number().int().min(1),
});

export const quotaPolicySchema = z.object({
  guest: tierLimitsSchema,
  user: tierLimitsSchema,
  tester: tierLimitsSchema,
});

/** Guests are normal User rows with a recognizable email (auth/actions.ts). */
export function isGuestEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@guest.studyos.app");
}

/** Parse the AI_TESTER_EMAILS env allowlist into a normalized set. */
function testerEmailSet(): Set<string> {
  return new Set(
    (process.env.AI_TESTER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Classify a user into a quota tier from their email alone (pure). */
export function tierForEmail(email: string): QuotaTier {
  const normalized = email.trim().toLowerCase();
  if (isGuestEmail(normalized)) return "guest";
  if (testerEmailSet().has(normalized)) return "tester";
  return "user";
}

/** Validate a stored/override policy blob, falling back to the code default. */
export function coercePolicy(stored: unknown): QuotaPolicy {
  if (stored == null) return DEFAULT_QUOTA_POLICY;
  const parsed = quotaPolicySchema.safeParse(stored);
  return parsed.success ? parsed.data : DEFAULT_QUOTA_POLICY;
}
