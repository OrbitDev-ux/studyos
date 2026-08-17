"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { MAX_FILE_SIZE_BYTES } from "@/features/study-materials/constants";
import { deriveMaterialType, resolveMimeType } from "@/features/study-materials/filename";
import {
  countFolderContents,
  getFolderForOwner,
  getFolderPath,
  getMaterialForOwner,
} from "@/features/study-materials/queries";
import {
  createUploadTargetSchema,
  folderNameSchema,
  renameFolderSchema,
  renameMaterialSchema,
} from "@/features/study-materials/schema";
import {
  buildStorageKey,
  createDownloadUrl,
  createSignedUploadTarget,
  deleteStorageObject,
  getUploadedObjectMetadata,
} from "@/features/study-materials/storage";

const MATERIALS_PATH = "/study-materials";

async function assertSubjectOwnership(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
  if (!subject) throw new Error("과목을 찾을 수 없습니다.");
}

async function assertFolderOwnership(userId: string, folderId: string) {
  const folder = await getFolderForOwner(userId, folderId);
  if (!folder) throw new Error("폴더를 찾을 수 없습니다.");
}

/**
 * Step 1 of upload: validate + write a "pending" StudyMaterial row, then
 * hand back a signed URL/token the browser uploads directly to (bypassing
 * our server, and Vercel's serverless body-size limit, entirely).
 */
export async function createUploadTarget(input: unknown) {
  const user = await requireCurrentUser();
  const parsed = createUploadTargetSchema.parse(input);

  const mimeType = resolveMimeType(parsed.name, parsed.mimeType);
  const type = deriveMaterialType(mimeType);
  if (!type) {
    throw new Error("지원하지 않는 파일 형식입니다.");
  }

  if (parsed.subjectId) await assertSubjectOwnership(user.id, parsed.subjectId);
  if (parsed.folderId) await assertFolderOwnership(user.id, parsed.folderId);

  const materialId = randomUUID();
  const storageKey = buildStorageKey(user.id, materialId, parsed.name);

  await prisma.studyMaterial.create({
    data: {
      id: materialId,
      userId: user.id,
      subjectId: parsed.subjectId ?? null,
      folderId: parsed.folderId ?? null,
      name: parsed.name,
      type,
      mimeType,
      size: parsed.size,
      storageKey,
      status: "pending",
    },
  });

  const { token, signedUrl } = await createSignedUploadTarget(storageKey);
  return { materialId, token, signedUrl };
}

/**
 * Step 2 of upload: after the browser's direct-to-storage upload finishes,
 * re-read the object's *actual* Storage-reported size/mimeType (never trust
 * the pre-upload client declaration) and flip the row to ready/failed.
 */
export async function confirmUpload(materialId: string): Promise<{ status: "ready" }> {
  const user = await requireCurrentUser();
  const material = await getMaterialForOwner(user.id, materialId);
  if (!material) throw new Error("자료를 찾을 수 없습니다.");
  if (material.status === "ready") return { status: "ready" };

  const uploaded = await getUploadedObjectMetadata(material.storageKey);
  if (!uploaded) {
    await prisma.studyMaterial.update({
      where: { id: materialId },
      data: { status: "failed" },
    });
    throw new Error("업로드가 완료되지 않았습니다. 다시 시도해주세요.");
  }

  const verifiedType = deriveMaterialType(uploaded.mimeType);
  if (!verifiedType || uploaded.size > MAX_FILE_SIZE_BYTES) {
    await deleteStorageObject(material.storageKey);
    await prisma.studyMaterial.update({
      where: { id: materialId },
      data: { status: "failed" },
    });
    throw new Error("업로드된 파일이 허용되지 않는 형식이거나 크기를 초과합니다.");
  }

  await prisma.studyMaterial.update({
    where: { id: materialId },
    data: {
      status: "ready",
      size: uploaded.size,
      mimeType: uploaded.mimeType,
      type: verifiedType,
    },
  });
  revalidatePath(MATERIALS_PATH);
  return { status: "ready" };
}

export async function renameMaterial(input: unknown) {
  const user = await requireCurrentUser();
  const parsed = renameMaterialSchema.parse(input);
  const material = await getMaterialForOwner(user.id, parsed.materialId);
  if (!material) throw new Error("자료를 찾을 수 없습니다.");

  await prisma.studyMaterial.update({
    where: { id: material.id },
    data: { name: parsed.name },
  });
  revalidatePath(MATERIALS_PATH);
}

export async function moveMaterial(materialId: string, folderId: string | null) {
  const user = await requireCurrentUser();
  const material = await getMaterialForOwner(user.id, materialId);
  if (!material) throw new Error("자료를 찾을 수 없습니다.");
  if (folderId) await assertFolderOwnership(user.id, folderId);

  await prisma.studyMaterial.update({ where: { id: material.id }, data: { folderId } });
  revalidatePath(MATERIALS_PATH);
}

export async function deleteMaterial(materialId: string) {
  const user = await requireCurrentUser();
  const material = await getMaterialForOwner(user.id, materialId);
  if (!material) throw new Error("자료를 찾을 수 없습니다.");

  await deleteStorageObject(material.storageKey);
  await prisma.studyMaterial.delete({ where: { id: material.id } });
  revalidatePath(MATERIALS_PATH);
}

/** Short-lived signed URL for preview/download — verifies ownership fresh on every call. */
export async function getMaterialDownloadUrl(materialId: string): Promise<string> {
  const user = await requireCurrentUser();
  const material = await getMaterialForOwner(user.id, materialId);
  if (!material || material.status !== "ready")
    throw new Error("자료를 찾을 수 없습니다.");

  return createDownloadUrl(material.storageKey);
}

export async function createFolder(input: unknown) {
  const user = await requireCurrentUser();
  const parsed = folderNameSchema.parse(input);
  if (parsed.parentId) await assertFolderOwnership(user.id, parsed.parentId);

  await prisma.materialFolder.create({
    data: { userId: user.id, name: parsed.name, parentId: parsed.parentId ?? null },
  });
  revalidatePath(MATERIALS_PATH);
}

export async function renameFolder(input: unknown) {
  const user = await requireCurrentUser();
  const parsed = renameFolderSchema.parse(input);
  const folder = await getFolderForOwner(user.id, parsed.folderId);
  if (!folder) throw new Error("폴더를 찾을 수 없습니다.");

  await prisma.materialFolder.update({
    where: { id: folder.id },
    data: { name: parsed.name },
  });
  revalidatePath(MATERIALS_PATH);
}

export async function moveFolder(folderId: string, newParentId: string | null) {
  const user = await requireCurrentUser();
  const folder = await getFolderForOwner(user.id, folderId);
  if (!folder) throw new Error("폴더를 찾을 수 없습니다.");

  if (newParentId) {
    if (newParentId === folderId) {
      throw new Error("폴더를 자기 자신으로 이동할 수 없습니다.");
    }
    await assertFolderOwnership(user.id, newParentId);
    const targetPath = await getFolderPath(user.id, newParentId);
    if (targetPath.some((f) => f.id === folderId)) {
      throw new Error("하위 폴더로 이동할 수 없습니다.");
    }
  }

  await prisma.materialFolder.update({
    where: { id: folder.id },
    data: { parentId: newParentId },
  });
  revalidatePath(MATERIALS_PATH);
}

/** Blocks deleting a non-empty folder — no cascading file deletion without
 * the user explicitly clearing it out first. */
export async function deleteFolder(folderId: string) {
  const user = await requireCurrentUser();
  const folder = await getFolderForOwner(user.id, folderId);
  if (!folder) throw new Error("폴더를 찾을 수 없습니다.");

  const contentCount = await countFolderContents(user.id, folderId);
  if (contentCount > 0) {
    throw new Error(
      "비어있지 않은 폴더는 삭제할 수 없습니다. 먼저 안의 자료를 이동하거나 삭제해주세요.",
    );
  }

  await prisma.materialFolder.delete({ where: { id: folder.id } });
  revalidatePath(MATERIALS_PATH);
}
