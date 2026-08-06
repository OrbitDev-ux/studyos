-- Supabase SDK migration, STEP 2 (problems slice).
-- Same model as grant_anon_study_sessions: no RLS (auth.uid() is never
-- populated since auth goes through Auth.js, not Supabase Auth), so this
-- only makes the tables reachable through PostgREST. Authorization stays
-- in application code (Server Actions filter by userId).
GRANT SELECT ON "Subject" TO anon;
GRANT SELECT, INSERT ON "ProblemSet" TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Problem" TO anon;
GRANT SELECT, INSERT ON "Choice" TO anon;
GRANT SELECT, INSERT, UPDATE ON "WrongAnswer" TO anon;
