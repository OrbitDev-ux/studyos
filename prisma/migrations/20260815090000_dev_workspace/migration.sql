-- Study OS Dev (v1): one personal dev workspace per user. Additive table only;
-- no existing data touched.
CREATE TABLE "DevWorkspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
    "containerId" TEXT,
    "runtime" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DevWorkspace_userId_key" ON "DevWorkspace"("userId");
CREATE INDEX "DevWorkspace_userId_idx" ON "DevWorkspace"("userId");

ALTER TABLE "DevWorkspace" ADD CONSTRAINT "DevWorkspace_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
