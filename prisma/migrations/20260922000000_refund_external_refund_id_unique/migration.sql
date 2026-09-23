-- Restores the unique index on Refund.externalRefundId that the schema has
-- always declared (@unique) but the original account_lifecycle_and_billing
-- migration omitted. Without it, refund webhook redeliveries can record the
-- same refund twice instead of collapsing via applyRefundEvent's dedupe.
CREATE UNIQUE INDEX "Refund_externalRefundId_key" ON "Refund"("externalRefundId");