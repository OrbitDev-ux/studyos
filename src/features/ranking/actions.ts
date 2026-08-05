"use server";

import { revalidatePath } from "next/cache";
import { schoolFormSchema } from "@/features/ranking/schema";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export async function updateSchool(school: string) {
  const user = await requireCurrentUser();
  const parsed = schoolFormSchema.parse({ school });

  await prisma.user.update({ where: { id: user.id }, data: { school: parsed.school } });
  revalidatePath("/ranking");
}
