import { SETTING_KEYS, getSetting } from "@/lib/admin/settings";
import {
  coercePolicy,
  tierForEmail,
  type QuotaPolicy,
  type TierLimits,
} from "@/features/ai/quota-core";

// DB-backed quota layer: reads the admin SystemSetting override (if any) and
// resolves per-user limits. The pure policy/tier logic lives in quota-core.ts.
export {
  isGuestEmail,
  tierForEmail,
  DEFAULT_QUOTA_POLICY,
  type QuotaTier,
  type TierLimits,
  type QuotaPolicy,
} from "@/features/ai/quota-core";

/**
 * The effective policy: the admin SystemSetting override if present and valid,
 * otherwise the code default. Invalid stored JSON falls back safely rather than
 * throwing (never let a bad setting break generation gating).
 */
export async function getQuotaPolicy(): Promise<QuotaPolicy> {
  const stored = await getSetting<unknown>(SETTING_KEYS.AI_QUOTA);
  return coercePolicy(stored);
}

export async function limitsForEmail(email: string): Promise<TierLimits> {
  const policy = await getQuotaPolicy();
  return policy[tierForEmail(email)];
}
