-- 자료실 (Study Materials): private per-user file library, metadata in
-- Postgres, bytes in a private Supabase Storage bucket. No existing data
-- touched — two new additive tables.

-- CreateTable
CREATE TABLE "MaterialFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "extractedText" TEXT,
    "processingStatus" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialFolder_userId_parentId_idx" ON "MaterialFolder"("userId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyMaterial_storageKey_key" ON "StudyMaterial"("storageKey");

-- CreateIndex
CREATE INDEX "StudyMaterial_userId_folderId_idx" ON "StudyMaterial"("userId", "folderId");

-- CreateIndex
CREATE INDEX "StudyMaterial_userId_createdAt_idx" ON "StudyMaterial"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyMaterial_subjectId_idx" ON "StudyMaterial"("subjectId");

-- AddForeignKey
ALTER TABLE "MaterialFolder" ADD CONSTRAINT "MaterialFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialFolder" ADD CONSTRAINT "MaterialFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MaterialFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MaterialFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SECURITY: private per-user data (uploaded file metadata / folder names) —
-- must never be readable/forgeable via the public PostgREST endpoint. Revoke
-- the anon role (Supabase auto-grants CRUD on new public tables) so only
-- server-side Prisma (owner role) can touch these rows, matching the existing
-- Notification/TutorConversation convention.
REVOKE ALL ON "MaterialFolder" FROM anon;
REVOKE ALL ON "StudyMaterial" FROM anon;

-- Storage: a single private bucket for all users' material files, objects
-- keyed "{userId}/{materialId}/{filename}" (see features/study-materials/storage.ts).
-- `public = false` and NO RLS policies are added on storage.objects for this
-- bucket on purpose: this app has no Supabase Auth session (auth.uid() is
-- never populated), so any policy granting the anon/authenticated role access
-- would be reachable by anyone holding the public anon key — effectively
-- public. Instead, ALL Storage operations for this bucket go through a
-- server-only service-role client (bypasses RLS entirely), with
-- requireCurrentUser() + ownerId ownership checks as the sole and sufficient
-- authorization gate — the same "server bypasses RLS, app code is the real
-- gate" pattern already used for Prisma vs. the REVOKEd anon Postgres role.
-- `file_size_limit`/`allowed_mime_types` are enforced by Supabase's own
-- Storage server (not just our declared metadata) as defense in depth.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'study-materials',
    'study-materials',
    false,
    10485760, -- 10 MiB
    ARRAY['application/pdf', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
