-- Supabase auto-enables RLS on new public tables. This app manages access with
-- GRANTs (RLS is disabled elsewhere), and the Edge middleware must read the
-- Maintenance row via the anon role — with RLS on and no policy it gets zero
-- rows. Disable RLS so the anon SELECT grant takes effect.
ALTER TABLE "Maintenance" DISABLE ROW LEVEL SECURITY;
