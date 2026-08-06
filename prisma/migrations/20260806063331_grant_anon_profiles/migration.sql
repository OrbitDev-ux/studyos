-- Supabase SDK migration, STEP 2 (profiles/User slice).
-- User already has SELECT from the battle slice migration; this adds
-- UPDATE for updateSchool(). Same no-RLS model as the other grant_anon_*
-- migrations — authorization stays in application code.
GRANT UPDATE ON "User" TO anon;
