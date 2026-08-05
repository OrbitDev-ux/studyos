-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "ProblemSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "unit" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemSetId" TEXT,
    "subjectId" TEXT,
    "type" "QuestionType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "unit" TEXT,
    "prompt" TEXT NOT NULL,
    "answerText" TEXT,
    "explanation" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemSet_userId_idx" ON "ProblemSet"("userId");

-- CreateIndex
CREATE INDEX "Problem_userId_idx" ON "Problem"("userId");

-- CreateIndex
CREATE INDEX "Problem_subjectId_idx" ON "Problem"("subjectId");

-- CreateIndex
CREATE INDEX "Choice_problemId_idx" ON "Choice"("problemId");

-- AddForeignKey
ALTER TABLE "ProblemSet" ADD CONSTRAINT "ProblemSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemSet" ADD CONSTRAINT "ProblemSet_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_problemSetId_fkey" FOREIGN KEY ("problemSetId") REFERENCES "ProblemSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
