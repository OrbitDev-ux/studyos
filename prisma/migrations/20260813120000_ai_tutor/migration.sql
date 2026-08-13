-- AI 1:1 과외 선생님(Tutor): student↔AI chat threads. Separate from the social
-- Conversation/Message (user-to-user DMs). Owner-scoped by userId.

-- CreateTable
CREATE TABLE "TutorConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorConversation_userId_updatedAt_idx" ON "TutorConversation"("userId", "updatedAt");

-- CreateTable
CREATE TABLE "TutorMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TutorMessage_conversationId_idx" ON "TutorMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "TutorConversation" ADD CONSTRAINT "TutorConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TutorMessage" ADD CONSTRAINT "TutorMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "TutorConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: tutor conversations are private study chats and must not be
-- readable/forgeable via the public PostgREST endpoint. Revoke the anon role
-- (Supabase auto-grants CRUD on new public tables) so only server-side Prisma
-- (owner role) can touch them — enforces "다른 사용자의 대화 접근 불가" at the DB level.
REVOKE ALL ON "TutorConversation" FROM anon;
REVOKE ALL ON "TutorMessage" FROM anon;
