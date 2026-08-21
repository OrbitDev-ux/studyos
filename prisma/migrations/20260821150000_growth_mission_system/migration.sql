-- Growth + Mission System (v1). Three new, fully additive tables — no
-- existing data touched, no existing column changed.

-- CreateTable
CREATE TABLE "UserGrowth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGrowth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthXpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthXpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyMission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "subjectId" TEXT,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGrowth_userId_key" ON "UserGrowth"("userId");

-- CreateIndex
CREATE INDEX "UserGrowth_userId_idx" ON "UserGrowth"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthXpEvent_userId_type_sourceId_key" ON "GrowthXpEvent"("userId", "type", "sourceId");

-- CreateIndex
CREATE INDEX "GrowthXpEvent_userId_createdAt_idx" ON "GrowthXpEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyMission_userId_status_idx" ON "StudyMission"("userId", "status");

-- CreateIndex
CREATE INDEX "StudyMission_userId_dueAt_idx" ON "StudyMission"("userId", "dueAt");

-- AddForeignKey
ALTER TABLE "UserGrowth" ADD CONSTRAINT "UserGrowth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthXpEvent" ADD CONSTRAINT "GrowthXpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMission" ADD CONSTRAINT "StudyMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMission" ADD CONSTRAINT "StudyMission_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SECURITY: these are private per-user reward/progress data (XP ledger,
-- mission progress) and must never be readable/writable via the public
-- PostgREST endpoint. Revoke the anon role (Supabase auto-grants CRUD on new
-- public tables) so only server-side Prisma (owner role) can touch them —
-- the same convention as Notification/TutorConversation/LabFeedback. In
-- particular this is what makes "client cannot directly set XP/level/streak"
-- true at the DB level, not just in application code.
REVOKE ALL ON "UserGrowth" FROM anon;
REVOKE ALL ON "GrowthXpEvent" FROM anon;
REVOKE ALL ON "StudyMission" FROM anon;
