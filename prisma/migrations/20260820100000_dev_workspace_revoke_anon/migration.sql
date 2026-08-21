-- SECURITY FIX: "DevWorkspace" (container id, runtime, per-user settings JSON)
-- is a Prisma-only table and should never be reachable via the public
-- PostgREST endpoint — every other Prisma-only table created since
-- 20260806 (Notification, StudyBook, TutorConversation, LabFeedback, ...)
-- already REVOKEs anon per this schema's stated convention, but the
-- 20260815090000_dev_workspace migration that created this table omitted
-- it. Supabase auto-grants anon CRUD on newly created public tables, so
-- until this migration this table had no access control of its own.
REVOKE ALL ON "DevWorkspace" FROM anon;
