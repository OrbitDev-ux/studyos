-- Friend activity feed opt-out (features/social/activity). Additive, no
-- existing data touched: defaults to true so existing users' activity stays
-- visible to friends until they explicitly turn it off.
ALTER TABLE "User" ADD COLUMN "activitySharingEnabled" BOOLEAN NOT NULL DEFAULT true;

-- SECURITY: anon's only UPDATE grant on "User" is the single "school" column
-- (see fix_anon_user_update_grant) — a new column is never anon-writable by
-- default, so no REVOKE is needed here. Every legitimate write to this column
-- goes through Prisma (owner role) via updateActivitySharing().
