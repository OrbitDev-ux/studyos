-- StudyOS Dev — Local Agent (v2). Replaces the remote-container architecture
-- (DevWorkspace, unchanged, no longer used by any code path — nothing is
-- dropped or migrated out of it) with a Local Agent the user runs on their
-- own machine. These four tables hold only pairing/session bookkeeping;
-- StudyOS Web never stores a real filesystem path or the agent's long-lived
-- credential in plaintext (see schema.prisma doc comments, SECURITY.md).

CREATE TABLE "DevAgentDevice" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "platform"   TEXT,
    "secretHash" TEXT NOT NULL,
    "localPort"  INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevAgentDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevAgentPairingRequest" (
    "id"                TEXT NOT NULL,
    "userCodeHash"      TEXT NOT NULL,
    "deviceName"        TEXT,
    "platform"          TEXT,
    "status"            TEXT NOT NULL DEFAULT 'PENDING',
    "userId"            TEXT,
    "deviceId"          TEXT,
    "deviceSecretPlain" TEXT,
    "requestIp"         TEXT,
    "attempts"          INTEGER NOT NULL DEFAULT 0,
    "expiresAt"         TIMESTAMP(3) NOT NULL,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevAgentPairingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevAgentPermissionGrant" (
    "id"         TEXT NOT NULL,
    "deviceId"   TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"  TIMESTAMP(3),

    CONSTRAINT "DevAgentPermissionGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DevAgentSession" (
    "id"         TEXT NOT NULL,
    "deviceId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "scope"      TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevAgentSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DevAgentDevice_secretHash_key" ON "DevAgentDevice"("secretHash");
CREATE INDEX "DevAgentDevice_userId_idx" ON "DevAgentDevice"("userId");

CREATE UNIQUE INDEX "DevAgentPairingRequest_userCodeHash_key" ON "DevAgentPairingRequest"("userCodeHash");
CREATE INDEX "DevAgentPairingRequest_expiresAt_idx" ON "DevAgentPairingRequest"("expiresAt");
CREATE INDEX "DevAgentPairingRequest_requestIp_createdAt_idx" ON "DevAgentPairingRequest"("requestIp", "createdAt");

CREATE UNIQUE INDEX "DevAgentPermissionGrant_deviceId_permission_key" ON "DevAgentPermissionGrant"("deviceId", "permission");

CREATE INDEX "DevAgentSession_deviceId_expiresAt_idx" ON "DevAgentSession"("deviceId", "expiresAt");

ALTER TABLE "DevAgentDevice" ADD CONSTRAINT "DevAgentDevice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevAgentPermissionGrant" ADD CONSTRAINT "DevAgentPermissionGrant_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "DevAgentDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DevAgentSession" ADD CONSTRAINT "DevAgentSession_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "DevAgentDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECURITY: pairing codes, device secret hashes, and session tokens must never
-- be readable/forgeable through the public PostgREST endpoint. Supabase
-- auto-grants the anon role CRUD on new public tables — revoke it so only
-- server-side Prisma (owner role) can ever touch these.
REVOKE ALL ON "DevAgentDevice" FROM anon;
REVOKE ALL ON "DevAgentPairingRequest" FROM anon;
REVOKE ALL ON "DevAgentPermissionGrant" FROM anon;
REVOKE ALL ON "DevAgentSession" FROM anon;
