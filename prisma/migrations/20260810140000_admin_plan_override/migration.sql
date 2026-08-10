-- Admin-only TEST plan override on "User" (features/billing/admin-override).
-- Does NOT change real billing: entitlement resolution uses adminPlanOverride
-- instead of `plan` only while adminPlanOverrideEnabled is true.
ALTER TABLE "User" ADD COLUMN     "adminPlanOverride" "Plan";
ALTER TABLE "User" ADD COLUMN     "adminPlanOverrideEnabled" BOOLEAN NOT NULL DEFAULT false;

-- SECURITY: the same guarantee as plan/subscriptionStatus/trial columns — a
-- client must NEVER be able to grant itself a plan via the public REST endpoint.
-- The fix_anon_user_update_grant migration already dropped the table-level
-- UPDATE grant (anon can only UPDATE "school"), so anon cannot write these new
-- columns. These explicit column revokes document + defend the intent even if a
-- broad grant is ever re-introduced. Every legitimate write goes through Prisma
-- (owner role), which bypasses grants.
REVOKE UPDATE ("adminPlanOverride", "adminPlanOverrideEnabled") ON "User" FROM anon;
REVOKE UPDATE ("adminPlanOverride", "adminPlanOverrideEnabled") ON "User" FROM authenticated;
REVOKE UPDATE ("adminPlanOverride", "adminPlanOverrideEnabled") ON "User" FROM PUBLIC;
