-- Phase 4 (오답 DNA): structured "why it was wrong" analysis + captured user answer.
--
-- ProblemAttempt.answerText: the answer the user actually gave (readable form),
-- needed to feed DNA analysis. Prisma-only table, already REVOKEd from anon.
ALTER TABLE "ProblemAttempt" ADD COLUMN     "answerText" TEXT;

-- WrongAnswer DNA fields: filled once on demand (analyzedAt set) by the AI.
-- WrongAnswer already has SELECT/INSERT/UPDATE granted to anon (revoke_excess
-- migration); table-level grants cover these new columns, no new GRANT needed.
ALTER TABLE "WrongAnswer" ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "errorConcept" TEXT,
ADD COLUMN     "errorReason" TEXT,
ADD COLUMN     "errorType" TEXT;
