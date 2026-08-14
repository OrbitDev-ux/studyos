-- Adaptive spaced repetition (Phase 6): per-item ease factor.
-- Safe additive column with a default so existing WrongAnswer rows keep the
-- current fixed-ladder behaviour (ease 2.5 → base intervals unchanged).
ALTER TABLE "WrongAnswer" ADD COLUMN "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5;
