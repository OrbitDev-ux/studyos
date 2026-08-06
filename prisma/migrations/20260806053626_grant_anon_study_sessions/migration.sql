-- Supabase SDK migration, STEP 2 (study-sessions slice).
--
-- The app authenticates through Auth.js, not Supabase Auth, so PostgREST
-- requests carrying the anon key are always evaluated as the `anon`
-- Postgres role — auth.uid() is never populated, so RLS policies keyed on
-- it can't enforce anything here. Authorization for this table stays in
-- application code (Server Actions still filter by userId), exactly like
-- the Prisma version did. This GRANT only makes the table reachable at
-- all; it does not by itself scope rows to a user.
GRANT SELECT, INSERT, UPDATE ON "StudySession" TO anon;
