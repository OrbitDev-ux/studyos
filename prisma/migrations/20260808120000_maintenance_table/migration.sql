-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "message" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- Seed the single row so there's always exactly one active state.
INSERT INTO "Maintenance" ("id", "enabled", "updatedAt")
VALUES ('singleton', false, CURRENT_TIMESTAMP);

-- Unlike the other admin tables, the maintenance flag is PUBLIC (a "we're
-- down" banner) and must be readable at the Edge (middleware) via the anon
-- role. Grant read-only; writes go through Prisma (postgres role), never anon.
REVOKE ALL ON "Maintenance" FROM anon;
GRANT SELECT ON "Maintenance" TO anon;
