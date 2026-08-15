-- Central notification system (features/notifications). Two additive changes,
-- no existing data touched:
--   1. User.notificationPreferences: per-category opt-out (null = all on).
--   2. Notification: one row per notification per recipient.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "actorId" TEXT,
    "targetUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: notifications are private per-user data (DM/friend-request/support
-- content, etc.) and must never be readable/forgeable via the public
-- PostgREST endpoint. Revoke the anon role (Supabase auto-grants CRUD on new
-- public tables) so only server-side Prisma (owner role) can touch them —
-- enforces "다른 사용자의 Notification 조회/수정 불가" at the DB level, matching
-- the existing TutorConversation/LabFeedback convention.
REVOKE ALL ON "Notification" FROM anon;
