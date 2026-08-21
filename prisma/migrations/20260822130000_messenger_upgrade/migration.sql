-- Messenger upgrade: edit/delete/reply on Message, a typing signal on
-- ConversationParticipant, and a new MessageReaction table. Fully additive —
-- no existing column changed or dropped, no existing data touched.

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN "typingAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "replyToId" TEXT;

-- CreateIndex
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON "MessageReaction"("messageId", "userId", "emoji");

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: same convention as every other new table this project has added
-- (UserGrowth/GrowthXpEvent/StudyMission/BlockedUser) — Supabase auto-grants
-- the anon role CRUD on new public tables, so revoke it explicitly. Only
-- server-side Prisma (owner role), behind editMessage/deleteMessage/
-- reactToMessage's own auth+ownership checks, may touch this table.
REVOKE ALL ON "MessageReaction" FROM anon;
