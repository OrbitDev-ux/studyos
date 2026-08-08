-- Learning OS foundation: per-attempt problem log + study-session type.
--
-- StudySession.type: what kind of study block a session was (FOCUS default so
-- every existing row stays valid). Additive, non-breaking.
ALTER TABLE "StudySession" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'FOCUS';

-- ProblemAttempt: one row per graded attempt (correct AND wrong), the source
-- of truth for weakness analysis / accuracy trends / solve speed.
CREATE TABLE "ProblemAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "subjectId" TEXT,
    "unit" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemAttempt_userId_createdAt_idx" ON "ProblemAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemAttempt_userId_subjectId_idx" ON "ProblemAttempt"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "ProblemAttempt_problemId_idx" ON "ProblemAttempt"("problemId");

-- AddForeignKey
ALTER TABLE "ProblemAttempt" ADD CONSTRAINT "ProblemAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemAttempt" ADD CONSTRAINT "ProblemAttempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Security: ProblemAttempt is written/read only through Prisma (owner role,
-- bypasses grants). Supabase auto-grants anon full CRUD on new public tables,
-- so revoke it — this personal learning data must never be reachable via the
-- public REST endpoint. RLS stays auto-enabled with no policies (default-deny
-- for anon), a harmless belt-and-suspenders since the grant is already gone.
REVOKE ALL ON "ProblemAttempt" FROM anon;
