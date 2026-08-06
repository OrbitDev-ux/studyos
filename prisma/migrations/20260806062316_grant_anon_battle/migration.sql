-- Supabase SDK migration, STEP 2 (battle slice).
-- Same model as the earlier grant_anon_* migrations: no RLS (auth.uid() is
-- never populated, this app authenticates through Auth.js not Supabase
-- Auth), so this only makes the tables reachable through PostgREST.
-- Authorization stays in application code (Server Actions filter by userId).
--
-- Todo/Goal SELECT is here because computeParticipantScore() in
-- battle/queries.ts reads them for the todo_count/goal_progress metrics —
-- it lives inside the battle feature even though the tables don't.
GRANT SELECT ON "Friendship" TO anon;
GRANT SELECT, INSERT ON "Battle" TO anon;
GRANT SELECT, INSERT, UPDATE ON "BattleParticipant" TO anon;
GRANT SELECT ON "User" TO anon;
GRANT SELECT ON "Todo" TO anon;
GRANT SELECT ON "Goal" TO anon;
