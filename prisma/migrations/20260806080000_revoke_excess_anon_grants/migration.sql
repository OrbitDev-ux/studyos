-- Supabase auto-grants full CRUD (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/
-- REFERENCES/TRIGGER) to the `anon` role on every table created in the
-- `public` schema, regardless of what the grant_anon_* migrations asked
-- for. Confirmed via information_schema.role_table_grants: anon had full
-- CRUD on every table, including Account/Session/VerificationToken and
-- _prisma_migrations, which no application code ever intended to expose.
--
-- This app has no RLS (Auth.js manages sessions, not Supabase Auth, so
-- auth.uid() is never populated) — GRANTs are the only access control
-- layer, so the auto-granted default must be revoked and replaced with
-- exactly the narrow set each Supabase-SDK slice actually uses.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT SELECT ON "Subject" TO anon;
GRANT SELECT, INSERT ON "ProblemSet" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Problem" TO anon;
GRANT SELECT, INSERT ON "Choice" TO anon;
GRANT SELECT, INSERT, UPDATE ON "WrongAnswer" TO anon;
GRANT SELECT, INSERT, UPDATE ON "StudySession" TO anon;
GRANT SELECT ON "Friendship" TO anon;
GRANT SELECT, INSERT ON "Battle" TO anon;
GRANT SELECT, INSERT, UPDATE ON "BattleParticipant" TO anon;
GRANT SELECT, UPDATE ON "User" TO anon;
GRANT SELECT ON "Todo" TO anon;
GRANT SELECT ON "Goal" TO anon;
