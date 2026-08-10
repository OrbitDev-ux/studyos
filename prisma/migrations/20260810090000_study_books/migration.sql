-- 나만의 교재 (Study Books). Additive only — three new tables. No existing table
-- rows are modified, so all current data is preserved. Problem items reuse the
-- existing "Problem" table (StudyBookItem.problemId), so problems are not
-- duplicated.

CREATE TABLE "StudyBook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectName" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "unit" TEXT,
    "difficulty" "Difficulty" NOT NULL,
    "type" TEXT NOT NULL,
    "customInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'generating',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyBookChapter" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "concept" TEXT,
    "reviewPoints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyBookChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyBookItem" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "problemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyBookItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyBook_userId_createdAt_idx" ON "StudyBook"("userId", "createdAt");
CREATE INDEX "StudyBookChapter_bookId_idx" ON "StudyBookChapter"("bookId");
CREATE INDEX "StudyBookItem_chapterId_idx" ON "StudyBookItem"("chapterId");
CREATE INDEX "StudyBookItem_problemId_idx" ON "StudyBookItem"("problemId");

-- AddForeignKey
ALTER TABLE "StudyBook" ADD CONSTRAINT "StudyBook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyBook" ADD CONSTRAINT "StudyBook_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudyBookChapter" ADD CONSTRAINT "StudyBookChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "StudyBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyBookItem" ADD CONSTRAINT "StudyBookItem_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "StudyBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyBookItem" ADD CONSTRAINT "StudyBookItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Security: Prisma-only tables. Supabase auto-grants anon full CRUD on new
-- public tables; revoke it so study-book data is never reachable/forgeable via
-- the public REST endpoint (all access goes through Prisma with owner-scoped
-- userId checks). RLS stays default-deny for anon.
REVOKE ALL ON "StudyBook" FROM anon;
REVOKE ALL ON "StudyBookChapter" FROM anon;
REVOKE ALL ON "StudyBookItem" FROM anon;
