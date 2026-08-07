import {
  FALLBACK_MESSAGE,
  LOGIN_MESSAGES,
  RARITY_ORDER,
  type LoginContext,
  type LoginMessage,
  type Rarity,
  type Role,
  type TimeOfDay,
} from "@/features/login-experience/messages";

/** Local wall-clock hour → bucket. Late Night is 00:00–04:59 (admin-special);
 * the 05:00 hour folds into morning so every hour is covered. */
export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour < 5) return "lateNight";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Weighted roll: <0.1 legendary, <1 epic, <10 rare, else common. */
function rollRarity(rng: () => number): Rarity {
  const r = rng() * 100;
  if (r < 0.1) return "legendary";
  if (r < 1) return "epic";
  if (r < 10) return "rare";
  return "common";
}

function isEligible(message: LoginMessage, ctx: LoginContext): boolean {
  if (message.roles && !message.roles.includes(ctx.role)) return false;
  if (message.times && !message.times.includes(ctx.timeOfDay)) return false;
  if (message.when && !message.when(ctx)) return false;
  return true;
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0]!;
}

/**
 * Choose the message to show. Selection order:
 *   1. Eligible overrides (special modes / seasonal events) — highest priority
 *      tier wins, bypassing the rarity roll.
 *   2. Otherwise a weighted rarity roll, downgrading to the next tier that has
 *      an eligible message so a rare roll never comes up empty.
 * `rng` is injectable for deterministic tests.
 */
export function selectLoginMessage(
  input: {
    role: Role;
    date?: Date;
    isFirstLogin?: boolean;
    streak?: number;
    isBetaTester?: boolean;
  },
  rng: () => number = Math.random,
): LoginMessage {
  const date = input.date ?? new Date();
  const ctx: LoginContext = {
    role: input.role,
    timeOfDay: getTimeOfDay(date),
    date,
    isFirstLogin: input.isFirstLogin,
    streak: input.streak,
    isBetaTester: input.isBetaTester,
  };

  const eligible = LOGIN_MESSAGES.filter((m) => isEligible(m, ctx));

  const overrides = eligible.filter((m) => m.override);
  if (overrides.length > 0) {
    const topPriority = Math.max(...overrides.map((m) => m.priority ?? 0));
    const top = overrides.filter((m) => (m.priority ?? 0) === topPriority);
    return pick(top, rng);
  }

  const rolled = rollRarity(rng);
  const startIndex = RARITY_ORDER.indexOf(rolled);
  for (let i = startIndex; i < RARITY_ORDER.length; i++) {
    const pool = eligible.filter((m) => m.rarity === RARITY_ORDER[i] && !m.override);
    if (pool.length > 0) return pick(pool, rng);
  }

  return eligible[0] ?? FALLBACK_MESSAGE;
}
