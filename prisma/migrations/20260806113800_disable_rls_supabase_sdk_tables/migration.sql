-- Supabase Cloud auto-enables Row Level Security on every table created in
-- the `public` schema, with zero policies attached. RLS-enabled + no
-- policies means default-deny for every non-owner role: PostgREST requests
-- from `anon` silently return an empty result set (200, not an error) no
-- matter what GRANTs exist, since RLS is evaluated after GRANT checks.
-- Confirmed live: a User row existed (visible via the direct Postgres
-- connection) but was invisible via the anon-key REST query authorize()
-- uses, breaking Credentials login for every user.
--
-- This app authenticates via Auth.js (JWT), not Supabase Auth, so
-- auth.uid() is never populated and no RLS policy here could reference the
-- real signed-in user — see the grant_anon_* migrations, where GRANTs were
-- already established as the only access-control layer. Disable RLS on
-- exactly the tables the Supabase-SDK slices touch; every other table stays
-- RLS-enabled (harmless — Prisma connects as the table owner and bypasses
-- RLS entirely, so this is a no-op for Prisma-only tables and a safety net
-- if they ever pick up an anon GRANT by accident).
ALTER TABLE "Subject" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProblemSet" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Problem" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Choice" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WrongAnswer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "StudySession" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Battle" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "BattleParticipant" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Todo" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" DISABLE ROW LEVEL SECURITY;
