-- New-user onboarding + AI cost protection.
--
-- User.tutorialCompletedAt: when the onboarding tutorial was finished/skipped.
-- Null (the default for every existing row) means "not done yet" → the tutorial
-- auto-starts on next load. Additive, non-breaking.
ALTER TABLE "User" ADD COLUMN     "tutorialCompletedAt" TIMESTAMP(3);

-- AiGenerationLog: server-side source of truth for AI cost protection (daily
-- quota / per-minute rate limit / concurrent-generation guard). One row per
-- generation attempt, created `pending` after passing the quota gate and then
-- flipped to success/validation_failed/error.
CREATE TABLE "AiGenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGenerationLog_userId_createdAt_idx" ON "AiGenerationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGenerationLog_userId_status_createdAt_idx" ON "AiGenerationLog"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "AiGenerationLog" ADD CONSTRAINT "AiGenerationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Security: AiGenerationLog is written/read only through Prisma (owner role,
-- bypasses grants). Supabase auto-grants anon full CRUD on new public tables,
-- so revoke it — quota/usage data must never be reachable or forgeable via the
-- public REST endpoint. RLS stays auto-enabled with no policies (default-deny
-- for anon), a harmless belt-and-suspenders since the grant is already gone.
REVOKE ALL ON "AiGenerationLog" FROM anon;
