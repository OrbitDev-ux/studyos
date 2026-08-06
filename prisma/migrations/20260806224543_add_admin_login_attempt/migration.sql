-- CreateTable
CREATE TABLE "AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_ip_createdAt_idx" ON "AdminLoginAttempt"("ip", "createdAt");

-- Supabase auto-grants full CRUD to anon on every table created in the
-- public schema (see the revoke_excess_anon_grants migration). This table
-- must never be reachable via the public PostgREST endpoint — the app only
-- ever accesses it through Prisma. Revoke the auto-grant explicitly rather
-- than relying on it never having been applied.
REVOKE ALL ON "AdminLoginAttempt" FROM anon;
