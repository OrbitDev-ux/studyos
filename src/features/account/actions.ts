"use server";

import { headers } from "next/headers";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { deleteStorageObject } from "@/features/study-materials/storage";
import {
  isAccountDeletionConfirmation,
} from "@/features/account/deletion-core";

function safeRequestMetadata(requestHeaders: Headers) {
  return {
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500) ?? null,
  };
}

export async function deleteMyAccount(confirmation: string): Promise<{ error?: string }> {
  const user = await requireCurrentUser();
  if (!isAccountDeletionConfirmation(confirmation)) {
    return { error: "확인 문구가 일치하지 않습니다." };
  }

  const requestHeaders = await headers();
  const metadata = safeRequestMetadata(requestHeaders);
  const deletionRequest = await prisma.dataDeletionRequest.create({
    data: {
      userId: user.id,
      status: "PENDING",
    },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, event: "ACCOUNT_DELETION_REQUESTED", ...metadata },
  });

  const materials = await prisma.studyMaterial.findMany({
    where: { userId: user.id },
    select: { storageKey: true },
  });
  try {
    for (const material of materials) await deleteStorageObject(material.storageKey);
  } catch {
    await prisma.dataDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: { status: "FAILED", failureReason: "storage_cleanup_failed" },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, event: "ACCOUNT_DELETION_FAILED", ...metadata },
    });
    return { error: "학습 자료를 정리하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.dataDeletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: "PROCESSING" },
      });
      await tx.dataDeletionRequest.update({
        where: { id: deletionRequest.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      // Keep this event after account deletion. It intentionally contains no user id.
      await tx.user.delete({ where: { id: user.id } });
      await tx.auditLog.create({
        data: { event: "ACCOUNT_DELETION_COMPLETED", ...metadata },
      });
    });
  } catch {
    await prisma.dataDeletionRequest.update({
      where: { id: deletionRequest.id },
      data: { status: "FAILED", failureReason: "database_cleanup_failed" },
    }).catch(() => undefined);
    return { error: "계정 정보를 정리하지 못했습니다. 잠시 후 다시 시도해주세요." };
  }

  await signOut({ redirectTo: "/login?deleted=1" });
  return {};
}
