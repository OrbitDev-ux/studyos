import type { Prisma } from "@/generated/prisma/client";
import { LEGAL_DOCUMENTS, type LegalDocSlug } from "@/features/legal/documents";
import { prisma } from "@/lib/prisma";

/**
 * Documents a user must agree to when creating an account. The signup schema
 * enforces these on the client AND server; this list is the single source for
 * which consents get recorded.
 */
export const SIGNUP_REQUIRED_CONSENTS: LegalDocSlug[] = ["terms", "privacy"];

/** Accepts either the PrismaClient or a $transaction client. */
type Db = Pick<Prisma.TransactionClient, "legalConsent">;

/**
 * Idempotently record that `userId` agreed to `documents` at their CURRENT
 * versions (read from features/legal/documents — never hardcode a version).
 * Safe to re-run: the unique (userId, documentType, version) index + skipDuplicates
 * means re-agreeing to the same version is a no-op. When a document's version is
 * bumped later, a fresh agreement creates a new row rather than overwriting.
 */
export async function recordConsents(
  db: Db,
  userId: string,
  documents: LegalDocSlug[],
): Promise<void> {
  if (documents.length === 0) return;
  await db.legalConsent.createMany({
    data: documents.map((slug) => ({
      userId,
      documentType: slug,
      version: LEGAL_DOCUMENTS[slug].version,
    })),
    skipDuplicates: true,
  });
}

/** Returns the latest version recorded for each document for the settings UI. */
export async function getCurrentConsents(userId: string) {
  const rows = await prisma.legalConsent.findMany({
    where: { userId },
    orderBy: [{ documentType: "asc" }, { agreedAt: "desc" }],
    select: { documentType: true, version: true, agreedAt: true, required: true, withdrawnAt: true },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.documentType)) latest.set(row.documentType, row);
  }
  return [...latest.values()];
}
