-- Enforce at most one ACTIVE subscription per user at the database level.
-- Prisma's schema syntax can't express a partial unique index, so this is
-- hand-written SQL layered on top of the existing Subscription table (see
-- schema.prisma's Subscription model doc comment).
--
-- Self-healing: if any user already has more than one ACTIVE subscription
-- (only possible from the bug this migration accompanies a fix for — see
-- applyPaymentEvent in src/features/billing/payment-service.ts), cancel every
-- one except the most recently created before adding the constraint, so this
-- migration can never fail on data it doesn't expect. Fully additive
-- otherwise — no column changed, no row deleted.
UPDATE "Subscription" s
SET "status" = 'CANCELED'
WHERE s."status" = 'ACTIVE'
  AND s."userId" IS NOT NULL
  AND s."id" <> (
    SELECT s2."id"
    FROM "Subscription" s2
    WHERE s2."userId" = s."userId"
      AND s2."status" = 'ACTIVE'
    ORDER BY s2."createdAt" DESC, s2."id" DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX "Subscription_userId_active_unique"
  ON "Subscription" ("userId")
  WHERE "status" = 'ACTIVE';
