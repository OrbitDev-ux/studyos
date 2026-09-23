/**
 * Product-analytics event catalog — the SLA.
 *
 * Every event StudyOS may emit is declared here as a discriminated union. This
 * is the single source of truth: TS enforces name+props at every call site
 * (add a new event -> the union grows -> call sites and EVENT_DESCRIPTIONS both
 * typecheck), so a deprecated/misspelled event is a compile error, not a
 * silent no-op. Keep this list small and non-PII: cohort analysis never needs
 * free-text user content.
 *
 * Transport today: server events are dev-logged only (Vercel Web Analytics is
 * client-only, no server sink configured yet), client events go to the Vercel
 * Web Analytics beacon via trackEvent(). See capture.ts / client.ts and the
 * transport seam comment in capture.ts for where a provider lands.
 *
 * Naming/usage rules:
 *  - verbs are past-tense completed facts (`signup_completed`, never a goal);
 *  - props hold only cheap, already-computed values (no extra queries);
 *  - firing an event must NEVER throw / block the business action that fires
 *    it, so capture()/trackEvent() swallow their own failures.
 */
export type AnalyticsEvent =
  | {
      name: "signup_completed";
      props: { method: "email" | "guest" };
    }
  | {
      name: "login_completed";
      props: { method: "credentials" | "google" | "guest" | "unknown" };
    }
  | {
      name: "problems_generated";
      props: { count: number; subject: string; type: string };
    }
  | { name: "demo_started"; props: Record<string, never> }
  | {
      name: "charge_succeeded";
      props: { plan: string; amount: number; currency: string; provider: string };
    }
  | {
      name: "subscription_canceled";
      props: { plan: string; atPeriodEnd: boolean };
    }
  | {
      name: "subscription_expired";
      props: { plan: string; reason: "grace" | "cancel" };
    }
  | {
      name: "checkout_started";
      props: { plan: string; provider: "polar" | "toss" };
    }
  | { name: "pricing_viewed"; props: Record<string, never> };

/** Human-readable catalog, kept in lockstep with the union above. */
export const EVENT_DESCRIPTIONS = {
  signup_completed: "A new account was created (email signup or guest account).",
  login_completed: "A user successfully signed in (any provider).",
  problems_generated: "AI problems were generated and persisted for a user.",
  demo_started: "A visitor entered the public demo (fires once per tab session).",
  charge_succeeded: "A successful charge granted (or kept) plan access. Fired on every successful charge event — new purchases and renewals are not distinguished here, that classification is the sink's job.",
  subscription_canceled: "The user chose to cancel at period end.",
  subscription_expired: "A subscription lapsed and plan access reverted to TRIAL (cancel-at-period-end, or charge-failure past the grace window).",
  checkout_started: "A checkout session was created — top of the purchase funnel, from which conversion = checkout_completed / checkout_started.",
  pricing_viewed: "The /pricing page was viewed (client-side).",
} as const satisfies Record<AnalyticsEvent["name"], string>;