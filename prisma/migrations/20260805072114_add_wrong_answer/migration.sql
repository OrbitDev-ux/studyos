-- CreateTable
CREATE TABLE "WrongAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'problem',
    "aiExplanation" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WrongAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WrongAnswer_userId_resolved_idx" ON "WrongAnswer"("userId", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "WrongAnswer_userId_problemId_key" ON "WrongAnswer"("userId", "problemId");

-- AddForeignKey
ALTER TABLE "WrongAnswer" ADD CONSTRAINT "WrongAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongAnswer" ADD CONSTRAINT "WrongAnswer_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
