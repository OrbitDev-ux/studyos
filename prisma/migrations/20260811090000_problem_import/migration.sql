-- Problem import pipeline (features/problems/import): exact-duplicate detection
-- + idempotency via a normalized-content fingerprint, plus origin/batch tracing.
-- No new Problem table and no duplicate-problem table — these columns live on the
-- existing Problem model.
ALTER TABLE "Problem" ADD COLUMN "fingerprint" TEXT;
ALTER TABLE "Problem" ADD COLUMN "source" TEXT;
ALTER TABLE "Problem" ADD COLUMN "importBatchId" TEXT;

-- Postgres treats NULLs as distinct in a UNIQUE index, so user-generated
-- problems (fingerprint NULL) never collide, while any two imported problems
-- with the same fingerprint cannot both be inserted — the DB-level idempotency
-- backstop for retried/duplicate import requests.
CREATE UNIQUE INDEX "Problem_fingerprint_key" ON "Problem"("fingerprint");

-- Fast filtering of shared (source = 'import') problems for the 문제은행.
CREATE INDEX "Problem_source_idx" ON "Problem"("source");
