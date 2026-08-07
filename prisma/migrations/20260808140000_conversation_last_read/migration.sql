-- AlterTable: track per-participant read position for unread badges.
ALTER TABLE "ConversationParticipant" ADD COLUMN "lastReadAt" TIMESTAMP(3);
