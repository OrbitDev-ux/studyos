"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { schoolFormSchema } from "@/features/ranking/schema";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

type Result = { error?: string };

export async function updateSchool(school: string): Promise<Result> {
  // requireCurrentUser() may redirect() (NEXT_REDIRECT control-flow) — stays
  // outside the try below so that's never swallowed as a generic failure.
  const user = await requireCurrentUser();
  const parsed = schoolFormSchema.safeParse({ school });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "학교 이름이 올바르지 않습니다." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { school: parsed.data.school },
    });

    revalidatePath("/ranking");
    return {};
  } catch (err) {
    console.error("[ranking] updateSchool failed", err);
    Sentry.captureException(err);
    return { error: "일시적인 오류가 발생했어요. 다시 시도해주세요." };
  }
}
