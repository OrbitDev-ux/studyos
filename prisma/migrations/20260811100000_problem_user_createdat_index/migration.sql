-- Performance: composite index for per-user problem lists ordered by recency
-- (getProblems, 문제은행 own-scope, weak-problems candidate pool). Serves
-- `WHERE "userId" = ? ORDER BY "createdAt"` as an index scan instead of a filter
-- + sort. Additive only — no behavior change; userId-only lookups use the prefix.
CREATE INDEX "Problem_userId_createdAt_idx" ON "Problem"("userId", "createdAt");
