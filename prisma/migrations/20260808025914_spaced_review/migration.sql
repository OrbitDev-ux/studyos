-- Phase 5 (자동 복습, spaced repetition): schedule fields on WrongAnswer.
-- reviewStage indexes the interval ladder; nextReviewAt is when it's due again.
ALTER TABLE "WrongAnswer" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewAt" TIMESTAMP(3),
ADD COLUMN     "reviewStage" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "WrongAnswer_userId_nextReviewAt_idx" ON "WrongAnswer"("userId", "nextReviewAt");

-- Backfill: existing unresolved wrong answers have no schedule yet — make them
-- due now (stage 0) so real historical data participates in the review loop
-- immediately rather than being silently excluded.
UPDATE "WrongAnswer" SET "nextReviewAt" = now() WHERE resolved = false AND "nextReviewAt" IS NULL;
