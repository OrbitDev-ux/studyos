-- StudyOS 실험실(Lab): admin-toggle state + analytics counters + per-user feedback.
-- Feature definitions live in code (features/lab/registry); these tables only hold
-- runtime state, so no duplicate feature-flag/analytics system is introduced.

-- CreateEnum
CREATE TYPE "LabFeedbackVote" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "LabFeatureState" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "successes" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabFeatureState_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "LabFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "vote" "LabFeedbackVote" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabFeedback_userId_featureKey_key" ON "LabFeedback"("userId", "featureKey");
CREATE INDEX "LabFeedback_featureKey_idx" ON "LabFeedback"("featureKey");

-- AddForeignKey
ALTER TABLE "LabFeedback" ADD CONSTRAINT "LabFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: lab analytics/feedback must not be readable/forgeable through the
-- public PostgREST endpoint. Supabase auto-grants the anon role CRUD on new
-- public tables — revoke it so only server-side Prisma (owner role) can touch
-- them (enforces "다른 사용자의 Analytics/피드백 조회 불가" and Feature-Flag 변조 방지).
REVOKE ALL ON "LabFeatureState" FROM anon;
REVOKE ALL ON "LabFeedback" FROM anon;
