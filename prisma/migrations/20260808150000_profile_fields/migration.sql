-- Profile system: extend User with a status message ("bio") and a presence
-- heartbeat timestamp ("lastSeenAt"). Nickname reuses `name` and avatar reuses
-- `image`, so no separate profile table is introduced. anon already holds
-- SELECT + UPDATE on "User" (see grant_anon_profiles), which covers reading
-- these columns and the presence heartbeat; authorization stays in app code.
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
