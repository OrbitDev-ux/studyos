import { z } from "zod";
import { MAX_FILE_SIZE_BYTES } from "@/features/study-materials/constants";

export const createUploadTargetSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(150),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  subjectId: z.string().optional(),
  folderId: z.string().optional(),
});
export type CreateUploadTargetInput = z.infer<typeof createUploadTargetSchema>;

export const renameMaterialSchema = z.object({
  materialId: z.string().min(1),
  name: z.string().trim().min(1, "이름을 입력해주세요").max(150),
});

export const folderNameSchema = z.object({
  name: z.string().trim().min(1, "폴더 이름을 입력해주세요").max(60),
  parentId: z.string().optional(),
});
export type FolderNameInput = z.infer<typeof folderNameSchema>;

export const renameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().trim().min(1, "폴더 이름을 입력해주세요").max(60),
});

export const searchMaterialsSchema = z.object({
  query: z.string().trim().min(1).max(100),
});
