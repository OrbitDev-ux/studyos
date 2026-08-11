import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SUBJECTS, SUBJECT_COLOR_PALETTE } from "@/features/subjects/constants";
import {
  IMPORT_SOURCE,
  IMPORT_USER_EMAIL,
  type ImportRepository,
  type NormalizedProblem,
} from "@/features/problems/import/types";

/**
 * Prisma-backed ImportRepository (owner role — imports never touch the public
 * anon endpoint). Writes go into the EXISTING Problem model, owned by the system
 * import account (resolved/created by a well-known email, not a hard-coded id),
 * with `source = "import"` so the 문제은행 can surface them as shared problems.
 */
export function createPrismaImportRepository(): ImportRepository {
  let importUserIdPromise: Promise<string> | null = null;
  const subjectIdByName = new Map<string, string>();

  /** The system account that owns imported problems (create-once). */
  function getImportUserId(): Promise<string> {
    importUserIdPromise ??= (async () => {
      const existing = await prisma.user.findUnique({
        where: { email: IMPORT_USER_EMAIL },
        select: { id: true },
      });
      if (existing) return existing.id;
      const created = await prisma.user.create({
        data: { email: IMPORT_USER_EMAIL, name: "StudyOS 문제은행" },
        select: { id: true },
      });
      return created.id;
    })();
    return importUserIdPromise;
  }

  /** The import user's Subject row for a canonical subject name (upsert-once). */
  async function getSubjectId(subjectName: string): Promise<string> {
    const cached = subjectIdByName.get(subjectName);
    if (cached) return cached;
    const userId = await getImportUserId();
    const color =
      DEFAULT_SUBJECTS.find((s) => s.name === subjectName)?.color ??
      SUBJECT_COLOR_PALETTE[0];
    const subject = await prisma.subject.upsert({
      where: { userId_name: { userId, name: subjectName } },
      create: { userId, name: subjectName, color },
      update: {},
      select: { id: true },
    });
    subjectIdByName.set(subjectName, subject.id);
    return subject.id;
  }

  return {
    async findExistingFingerprints(fingerprints) {
      if (fingerprints.length === 0) return new Set();
      const rows = await prisma.problem.findMany({
        where: { source: IMPORT_SOURCE, fingerprint: { in: fingerprints } },
        select: { fingerprint: true },
      });
      return new Set(
        rows.map((r) => r.fingerprint).filter((f): f is string => f != null),
      );
    },

    async insertProblem(problem: NormalizedProblem, meta) {
      const userId = await getImportUserId();
      const subjectId = await getSubjectId(problem.subjectName);
      try {
        const created = await prisma.problem.create({
          data: {
            userId,
            subjectId,
            source: IMPORT_SOURCE,
            fingerprint: meta.fingerprint,
            importBatchId: meta.batchId,
            type: problem.type,
            difficulty: problem.difficulty,
            unit: problem.unit,
            prompt: problem.prompt,
            explanation: problem.explanation,
            answerText: problem.answerText,
            scoringCriteria: problem.scoringCriteria,
            ...(problem.choices && problem.choices.length > 0
              ? {
                  choices: {
                    create: problem.choices.map((c) => ({
                      label: c.label,
                      content: c.content,
                      isCorrect: c.isCorrect,
                    })),
                  },
                }
              : {}),
          },
          select: { id: true },
        });
        return { id: created.id };
      } catch (err) {
        // Fingerprint unique violation → a concurrent/retried insert won the race.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          return { duplicate: true };
        }
        throw err;
      }
    },

    async countImportedProblems() {
      return prisma.problem.count({ where: { source: IMPORT_SOURCE } });
    },
  };
}
