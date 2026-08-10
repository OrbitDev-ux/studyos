-- Legal document consent records. One row per (user, documentType, version);
-- documentType/version mirror features/legal/documents so a version bump can
-- require fresh consent without a schema change.
CREATE TABLE "LegalConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalConsent_userId_documentType_version_key" ON "LegalConsent"("userId", "documentType", "version");

-- CreateIndex
CREATE INDEX "LegalConsent_userId_idx" ON "LegalConsent"("userId");

-- AddForeignKey
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: consent records must never be readable/forgeable through the public
-- PostgREST endpoint. Supabase auto-grants the anon role full CRUD on new public
-- tables — revoke it so only server-side Prisma (owner role) can read/write.
-- This enforces "다른 사용자의 동의 기록 조회/수정 불가" at the database level.
REVOKE ALL ON "LegalConsent" FROM anon;
