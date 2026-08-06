import { DEFAULT_SUBJECTS } from "@/features/subjects/constants";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Seeds the default subject set for a brand-new user, regardless of which
 * sign-up path (Google OAuth event vs. email/password Server Action)
 * created them. Accepts an optional transaction client so the email/password
 * path can create the user row and seed subjects atomically. */
export function seedDefaultSubjects(
  userId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return client.subject.createMany({
    data: DEFAULT_SUBJECTS.map((subject, index) => ({
      userId,
      name: subject.name,
      color: subject.color,
      order: index,
    })),
  });
}
