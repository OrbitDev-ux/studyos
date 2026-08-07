// Login Experience — the message catalogue and its shape. Nothing here is
// hard-coded into components; the selector (select.ts) reads this list, so
// adding a message or a whole event is a data edit, not a code change.

export type Role = "user" | "admin";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "lateNight";
export type Rarity = "common" | "rare" | "epic" | "legendary";

/** Context passed to every eligibility predicate. Extend this (streak,
 * isFirstLogin, isBetaTester, …) to unlock new conditional messages without
 * touching the selector. */
export type LoginContext = {
  role: Role;
  timeOfDay: TimeOfDay;
  date: Date;
  isFirstLogin?: boolean;
  streak?: number;
  isBetaTester?: boolean;
};

export type LoginMessage = {
  id: string;
  rarity: Rarity;
  /** Headline (usually emoji + short phrase). */
  title: string;
  /** Optional body; "\n" renders as separate lines. */
  message?: string;
  /** Limit to these roles; omit for all roles. */
  roles?: Role[];
  /** Limit to these times of day; omit for any time. */
  times?: TimeOfDay[];
  /** Extra gate for events/streaks/first-login/etc. Return true to be eligible. */
  when?: (ctx: LoginContext) => boolean;
  /** Bypass the rarity roll and take over when eligible (special modes/events). */
  override?: boolean;
  /** Tie-break among eligible overrides; higher wins (default 0). */
  priority?: number;
  /** "hero" = large, multi-line, branded card (e.g. Late Night Coding Mode). */
  variant?: "default" | "hero";
  /** Show the "🌙 StudyOS" brand mark above the title. */
  brand?: boolean;
};

// Weighted rarity: Common 90% · Rare 9% · Epic 0.9% · Legendary 0.1%.
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 90,
  rare: 9,
  epic: 0.9,
  legendary: 0.1,
};

/** Highest → lowest, used for graceful downgrade when a rolled tier is empty. */
export const RARITY_ORDER: Rarity[] = ["legendary", "epic", "rare", "common"];

export const LOGIN_MESSAGES: LoginMessage[] = [
  // ─── User · common ────────────────────────────────────────────────────────
  { id: "u-welcome", rarity: "common", roles: ["user"], title: "👋 Welcome back" },
  {
    id: "u-step",
    rarity: "common",
    roles: ["user"],
    title: "🌱 Every small step counts.",
  },
  { id: "u-keep", rarity: "common", roles: ["user"], title: "🌙 Keep going." },
  {
    id: "u-morning",
    rarity: "common",
    roles: ["user"],
    times: ["morning"],
    title: "☀️ Have a productive day.",
  },
  {
    id: "u-afternoon",
    rarity: "common",
    roles: ["user"],
    times: ["afternoon"],
    title: "📚 Ready to learn?",
  },
  {
    id: "u-evening",
    rarity: "common",
    roles: ["user"],
    times: ["evening"],
    title: "🌙 Keep going — you're doing great.",
  },
  {
    id: "u-latenight",
    rarity: "common",
    roles: ["user"],
    times: ["lateNight"],
    title: "🌙 Studying late? Rest well after.",
  },

  // ─── User · rare ──────────────────────────────────────────────────────────
  {
    id: "u-coffee",
    rarity: "rare",
    roles: ["user"],
    title: "☕ Fuel up. You've got this.",
  },

  // ─── Admin · common ───────────────────────────────────────────────────────
  {
    id: "a-granted",
    rarity: "common",
    roles: ["admin"],
    title: "🛡️ Administrator access granted",
  },
  { id: "a-dashboard", rarity: "common", roles: ["admin"], title: "📊 Dashboard ready" },
  { id: "a-online", rarity: "common", roles: ["admin"], title: "⚡ System online" },
  { id: "a-build", rarity: "common", roles: ["admin"], title: "🚀 Ready to build" },
  {
    id: "a-commit",
    rarity: "common",
    roles: ["admin"],
    title: "💾 Don't forget to commit.",
  },

  // ─── Admin · rare ─────────────────────────────────────────────────────────
  { id: "a-coffee", rarity: "rare", roles: ["admin"], title: "☕ Coffee not included." },
  {
    id: "a-bugs",
    rarity: "rare",
    roles: ["admin"],
    title: "🐛 Hope there are no bugs today.",
  },
  { id: "a-deploy", rarity: "rare", roles: ["admin"], title: "🚀 Ready to deploy." },

  // ─── Admin · epic ─────────────────────────────────────────────────────────
  {
    id: "a-builder",
    rarity: "epic",
    roles: ["admin"],
    title: "🛠️ Builder Mode",
    message: "Keep creating.",
  },

  // ─── Admin · legendary ────────────────────────────────────────────────────
  {
    id: "a-founder",
    rarity: "legendary",
    roles: ["admin"],
    title: "👑 Founder Mode",
    message: "The system welcomes its creator.",
  },

  // ─── Special: Late Night Coding Mode (admin, 00:00–04:00) ─────────────────
  {
    id: "late-night-coding",
    rarity: "epic",
    roles: ["admin"],
    times: ["lateNight"],
    override: true,
    priority: 10,
    variant: "hero",
    brand: true,
    title: "Late Night Coding Mode",
    message: "The world is sleeping.\nYou're still building.",
  },

  // ─── Extensible event examples (override; add more the same way) ───────────
  {
    id: "event-newyear",
    rarity: "epic",
    override: true,
    priority: 20,
    variant: "hero",
    brand: true,
    title: "🎉 Happy New Year",
    message: "A fresh year of learning begins.",
    when: (ctx) => ctx.date.getMonth() === 0 && ctx.date.getDate() === 1,
  },
  {
    id: "event-christmas",
    rarity: "epic",
    override: true,
    priority: 20,
    variant: "hero",
    brand: true,
    title: "🎄 Merry Christmas",
    message: "Take a break — you've earned it.",
    when: (ctx) => ctx.date.getMonth() === 11 && ctx.date.getDate() === 25,
  },
];

/** Guaranteed non-empty fallback, in case a future filter excludes everything. */
export const FALLBACK_MESSAGE: LoginMessage = {
  id: "fallback",
  rarity: "common",
  title: "👋 Welcome back",
};
