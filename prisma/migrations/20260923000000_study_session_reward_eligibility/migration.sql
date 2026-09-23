-- Anti-cheat (pre-launch hardening): split wall-clock study time (durationSec,
-- the personal record) from the server-verified portion (rewardEligibleDurationSec)
-- that may drive rewarded/competitive surfaces (XP, streak, ranking, battle
-- study-time, missions, friend feed).
--
-- rewardEligibleDurationSec is credited only while the existing app-wide presence
-- heartbeat (touchPresence) proves foreground activity within a bounded window
-- (see features/study-sessions/eligibility.ts). lastVerifiedAt is the
-- server-stamped checkpoint used to measure contiguous activity. Neither is ever
-- client-supplied; StudySession has no anon-role access (Prisma-only table).

ALTER TABLE "StudySession"
  ADD COLUMN "rewardEligibleDurationSec" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastVerifiedAt" TIMESTAMPTZ;

-- Pre-launch backfill: historical closed sessions predate this rule and were
-- recorded honestly by the app timer, so treat them as fully eligible — this
-- preserves existing users' streaks/rankings/battle time instead of zeroing them.
-- Still-open legacy sessions stay at 0 credited; checkpointing resumes from
-- their own start so the bounded-window rule takes over from now on.
UPDATE "StudySession"
  SET "rewardEligibleDurationSec" = "durationSec",
      "lastVerifiedAt" = "endedAt"
  WHERE "endedAt" IS NOT NULL;

UPDATE "StudySession"
  SET "lastVerifiedAt" = "startedAt"
  WHERE "endedAt" IS NULL;