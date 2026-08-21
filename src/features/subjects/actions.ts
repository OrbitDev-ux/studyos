"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { subjectFormSchema, type SubjectFormValues } from "@/features/subjects/schema";

export type SubjectActionResult = { error?: string };

const DUPLICATE_NAME_ERROR = "이미 있는 과목명입니다.";

export async function createSubject(
  values: SubjectFormValues,
): Promise<SubjectActionResult> {
  const user = await requireCurrentUser();
  const parsed = subjectFormSchema.parse(values);
  const count = await prisma.subject.count({ where: { userId: user.id } });

  try {
    await prisma.subject.create({
      data: { userId: user.id, name: parsed.name, color: parsed.color, order: count },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: DUPLICATE_NAME_ERROR };
    }
    throw err;
  }

  revalidatePath("/subjects");
  return {};
}

export async function updateSubject(
  subjectId: string,
  values: SubjectFormValues,
): Promise<SubjectActionResult> {
  const user = await requireCurrentUser();
  const parsed = subjectFormSchema.parse(values);

  try {
    await prisma.subject.updateMany({
      where: { id: subjectId, userId: user.id },
      data: { name: parsed.name, color: parsed.color },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: DUPLICATE_NAME_ERROR };
    }
    throw err;
  }

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  revalidatePath("/todos");
  return {};
}

// Swap-with-neighbor reorder — same pattern as study-books' moveBookItem:
// atomic two-row swap of the `order` column, scoped by ownership via the
// sibling lookup itself (a subjectId belonging to another user simply
// won't appear in `siblings`, so the swap silently no-ops).
export async function moveSubject(subjectId: string, direction: "up" | "down"): Promise<void> {
  const user = await requireCurrentUser();
  const siblings = await prisma.subject.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const idx = siblings.findIndex((s) => s.id === subjectId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;

  const a = siblings[idx]!;
  const b = siblings[swapIdx]!;
  await prisma.$transaction([
    prisma.subject.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.subject.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}

export async function deleteSubject(subjectId: string) {
  const user = await requireCurrentUser();
  await prisma.subject.deleteMany({ where: { id: subjectId, userId: user.id } });
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}
