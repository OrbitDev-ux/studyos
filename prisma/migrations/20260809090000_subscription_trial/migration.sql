-- Subscription / Trial / Plan structure on User (no billing yet).
--
-- Plan (TRIAL default) + SubscriptionStatus (TRIALING default) + trial window.
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'PRO', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'EXPIRED', 'CANCELED');

ALTER TABLE "User" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "User" ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING';
ALTER TABLE "User" ADD COLUMN     "trialStartedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- Backfill existing users onto a trial anchored at their signup date so the
-- 7-day window is server-authoritative and consistent (learning data untouched).
UPDATE "User"
   SET "trialStartedAt" = COALESCE("trialStartedAt", "createdAt"),
       "trialEndsAt"    = COALESCE("trialEndsAt", "createdAt" + interval '7 days');

-- SECURITY: the Supabase anon role holds table-level GRANT UPDATE ON "User"
-- (grant_anon_profiles / revoke_excess_anon_grants) for the profile editor.
-- Revoke UPDATE on the subscription columns so a client can NEVER change its own
-- plan, status, or trial dates through the public REST endpoint. These may only
-- be written server-side by Prisma (owner role, which bypasses grants). Other
-- columns stay updatable; SELECT is unaffected.
REVOKE UPDATE ("plan", "subscriptionStatus", "trialStartedAt", "trialEndsAt") ON "User" FROM anon;
REVOKE UPDATE ("plan", "subscriptionStatus", "trialStartedAt", "trialEndsAt") ON "User" FROM authenticated;
REVOKE UPDATE ("plan", "subscriptionStatus", "trialStartedAt", "trialEndsAt") ON "User" FROM PUBLIC;
