-- Shared-content attachment on Message (e.g. sharing a Problem into a DM).
-- Fully additive — no existing column changed, no existing data touched.

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "sharedType" TEXT,
ADD COLUMN "sharedId" TEXT;
