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

export async function deleteSubject(subjectId: string) {
  const user = await requireCurrentUser();
  await prisma.subject.deleteMany({ where: { id: subjectId, userId: user.id } });
  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}
