-- SECURITY: close the anon-REST trust boundary for good.
--
-- Before this migration, 12 user-data tables were readable/writable by
-- Supabase's `anon` role over the public REST endpoint, with Row Level
-- Security DISABLED on them (GRANTs were the only access-control layer). The
-- anon key is bundled in the browser via NEXT_PUBLIC_SUPABASE_ANON_KEY, so
-- anyone — without any authentication, defeating Auth.js entirely — could:
--
--   GET /rest/v1/User?select=*     → every user's email + bcrypt password hash,
--                                     school, timezone, plan, trial dates, …
--   GET /rest/v1/Problem?select=*  → prompt, answer text, explanations, keys
--   GET /rest/v1/StudySession|Todo|Goal|WrongAnswer|Friendship|Battle|…
--
-- The app NOW performs every one of these reads/writes through Prisma (the
-- DB owner role), which bypasses GRANT/RLS checks entirely and is secured by
-- server-side authorization + explicit `.eq("userId", …)` scoping in code. So
-- the anon role needs no access to any table at all.
--
-- This migration therefore:
--   1. Revokes every anon/authenticated grant on all tables and sequences in
--      the public schema (plus the same for PUBLIC, belt-and-suspenders).
--   2. Enables RLS on the 12 previously-exposed tables. With zero policies,
--      RLS is default-deny for non-owner roles — Prisma (owner) is untouched,
--      and any FUTURE accidental anon GRANT becomes inert instead of a live
--      exposure. (These tables' RLS was explicitly DISABLED earlier, so this
--      is a no-op-free re-enable, not a first-time enable.)
--   3. Revokes default privileges so tables created later don't silently get
--      anon/authenticated grants back from Supabase's default privileges.
--
-- The application code change that made this possible (migrating the 49
-- Supabase SDK call sites to Prisma) landed together with this migration; see
-- docs/BASELINE.md and the audit trail in OVERNIGHT_AUDIT.md.
--
-- Prisma-only tables that were never granted and are already RLS-enabled
-- (ActionAudit etc.) are left exactly as they are. "Maintenance" is the ONE
-- deliberate carve-out: the edge middleware's maintenance gate reads a single
-- public row (enabled/title/message, id='singleton' — no user data) over REST
-- from the Edge runtime, where Prisma is unavailable (lib/maintenance-edge.ts).
-- The revoke below strips its old grant-wide access, and the policy lines at
-- the bottom re-grant ONLY that one anon SELECT, now RLS-gated to the singleton
-- row — closing the grant-wide exposure instead of removing the feature.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;

-- Re-enable RLS (default-deny) on every table the old Supabase-SDK slices
-- touched. Prisma connects as the table owner and bypasses RLS, so this is a
-- no-op for the app itself and a durable safety net against future grants.
ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProblemSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Problem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Choice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WrongAnswer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudySession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Battle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BattleParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Todo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;

-- Sole carve-out: the edge maintenance gate (lib/maintenance-edge.ts) reads the
-- one public Maintenance row over REST from the Edge runtime, where Prisma
-- can't run. RLS on + a permissive policy means anon sees ONLY the singleton
-- row (USING id='singleton'), and nothing else grants can sneak in — the same
-- default-deny posture as the 12 user-data tables.
ALTER TABLE "Maintenance" ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public."Maintenance" TO anon;
CREATE POLICY "anon_select_maintenance" ON public."Maintenance"
  FOR SELECT TO anon
  USING (id = 'singleton');