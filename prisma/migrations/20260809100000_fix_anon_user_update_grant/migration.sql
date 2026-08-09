-- SECURITY FIX: close the anon self-upgrade hole on "User".
--
-- The subscription_trial migration tried to protect plan/subscriptionStatus/
-- trialStartedAt/trialEndsAt with column-level `REVOKE UPDATE (col) ... FROM
-- anon`. That was INEFFECTIVE: anon holds a TABLE-level `GRANT UPDATE ON "User"`
-- (grant_anon_profiles / revoke_excess_anon_grants), and in PostgreSQL a
-- table-level UPDATE grant covers every column, so a column-level revoke does
-- nothing while the table grant stands. Verified live: anon could PATCH
-- plan='PREMIUM' via the public REST endpoint and it succeeded.
--
-- Correct approach: drop the broad table-level UPDATE and re-grant UPDATE on
-- ONLY the column the Supabase SDK legitimately writes as anon — `school`
-- (features/ranking/actions.ts#updateSchool). Every other "User" write in the
-- app goes through Prisma (owner role, which bypasses grants): profile edit,
-- presence heartbeat, onboarding, billing plan changes, admin. So this neither
-- breaks those nor lets a client touch plan/subscription/trial columns.
REVOKE UPDATE ON "User" FROM anon;
REVOKE UPDATE ON "User" FROM authenticated;
REVOKE UPDATE ON "User" FROM PUBLIC;

-- Re-grant the single column anon needs (school edit on the ranking page).
GRANT UPDATE ("school") ON "User" TO anon;
