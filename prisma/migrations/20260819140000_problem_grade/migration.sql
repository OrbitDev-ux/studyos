-- Adds Problem.grade (denormalized canonical grade name, e.g. "중학교 1학년"),
-- mirroring the existing StudyBook.grade column. Additive, nullable — no
-- backfill, no data loss, existing rows simply have grade = NULL.

ALTER TABLE "Problem" ADD COLUMN "grade" TEXT;
