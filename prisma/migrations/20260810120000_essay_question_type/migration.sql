-- Add 서술형 (ESSAY) to the shared QuestionType enum + a scoring-criteria column
-- on Problem. Additive only — existing MC / short-answer rows are untouched, and
-- the new enum value is not used within this migration (safe on Postgres).

ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ESSAY';

-- ESSAY-only: key scoring points / partial-credit criteria (nullable elsewhere).
ALTER TABLE "Problem" ADD COLUMN "scoringCriteria" TEXT;

-- Study books can now choose their problem type (객관식/단답형/서술형); default
-- keeps every existing book on multiple choice.
ALTER TABLE "StudyBook" ADD COLUMN "problemType" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE';
