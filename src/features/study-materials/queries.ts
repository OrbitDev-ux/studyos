import { prisma } from "@/lib/prisma";

// Metadata only — never the future extractedText column. List views must
// stay cheap regardless of how large a document's extracted text gets later.
const MATERIAL_LIST_SELECT = {
  id: true,
  name: true,
  type: true,
  mimeType: true,
  size: true,
  status: true,
  subjectId: true,
  folderId: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: { id: true, name: true, color: true } },
} as const;

export async function listFolderContents(userId: string, folderId: string | null) {
  const [folders, materials] = await Promise.all([
    prisma.materialFolder.findMany({
      where: { userId, parentId: folderId },
      orderBy: { name: "asc" },
    }),
    prisma.studyMaterial.findMany({
      where: { userId, folderId, status: "ready" },
      select: MATERIAL_LIST_SELECT,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { folders, materials };
}

export function getRecentMaterials(userId: string, limit = 5) {
  return prisma.studyMaterial.findMany({
    where: { userId, status: "ready" },
    select: MATERIAL_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function getFolderForOwner(userId: string, folderId: string) {
  return prisma.materialFolder.findFirst({ where: { id: folderId, userId } });
}

/** All of a user's folders (id/name/parentId only) — used to build the "move
 * to folder" picker, which needs the whole tree rather than one level. */
export function listAllFolders(userId: string) {
  return prisma.materialFolder.findMany({
    where: { userId },
    select: { id: true, name: true, parentId: true },
    orderBy: { name: "asc" },
  });
}

export function getMaterialForOwner(userId: string, materialId: string) {
  return prisma.studyMaterial.findFirst({ where: { id: materialId, userId } });
}

/** Breadcrumb trail from root to `folderId` (root-first). Stops early —
 * rather than throwing — if a folder in the chain doesn't belong to `userId`,
 * so a bad id never leaks another user's folder names. */
export async function getFolderPath(
  userId: string,
  folderId: string | null,
): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = [];
  let currentId = folderId;
  while (currentId) {
    const folder = await prisma.materialFolder.findFirst({
      where: { id: currentId, userId },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) break;
    path.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return path;
}

/** Subfolder + material count directly inside a folder — used to block
 * deleting a non-empty folder. */
export async function countFolderContents(
  userId: string,
  folderId: string,
): Promise<number> {
  const [subfolders, materials] = await Promise.all([
    prisma.materialFolder.count({ where: { userId, parentId: folderId } }),
    prisma.studyMaterial.count({ where: { userId, folderId } }),
  ]);
  return subfolders + materials;
}

const SEARCH_RESULT_LIMIT = 50;

export async function searchMaterials(userId: string, query: string) {
  const [materials, folders] = await Promise.all([
    prisma.studyMaterial.findMany({
      where: {
        userId,
        status: "ready",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { subject: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: MATERIAL_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      take: SEARCH_RESULT_LIMIT,
    }),
    prisma.materialFolder.findMany({
      where: { userId, name: { contains: query, mode: "insensitive" } },
      orderBy: { name: "asc" },
      take: SEARCH_RESULT_LIMIT,
    }),
  ]);
  return { materials, folders };
}
