-- AlterTable: richer IP bans (permanent / time-limited / soft-disable)
ALTER TABLE "BlockedIp" ADD COLUMN "permanent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BlockedIp" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "BlockedIp" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BlockedIp" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "BlockedIp_active_idx" ON "BlockedIp"("active");

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "activeVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_type_key" ON "Prompt"("type");

-- CreateIndex
CREATE INDEX "Prompt_type_idx" ON "Prompt"("type");

-- CreateIndex
CREATE INDEX "PromptVersion_promptId_idx" ON "PromptVersion"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma-only admin tables must never be reachable via the public PostgREST
-- endpoint (Supabase auto-grants anon full CRUD on new public tables).
REVOKE ALL ON "Prompt" FROM anon;
REVOKE ALL ON "PromptVersion" FROM anon;
