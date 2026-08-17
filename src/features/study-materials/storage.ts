import { createAdminClient } from "@/lib/supabase/admin";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  MATERIALS_BUCKET,
} from "@/features/study-materials/constants";
import { sanitizeFilename } from "@/features/study-materials/filename";

/** `{userId}/{materialId}/{sanitized filename}` — the directory components are
 * always server-controlled (never taken from client input), so a user can
 * never read/write outside their own prefix. */
export function buildStorageKey(
  userId: string,
  materialId: string,
  filename: string,
): string {
  return `${userId}/${materialId}/${sanitizeFilename(filename)}`;
}

/** A one-time signed URL + token the browser uploads directly to, bypassing
 * our server entirely (Vercel serverless request bodies are capped well
 * under the material size limit). Valid for 2 hours (Supabase Storage default). */
export async function createSignedUploadTarget(
  storageKey: string,
): Promise<{ path: string; token: string; signedUrl: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUploadUrl(storageKey);
  if (error) throw error;
  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * Reads back the object's Storage-reported size/mimeType after an upload —
 * the source of truth, not whatever the client declared beforehand. Returns
 * null if the object doesn't exist (upload never completed / was abandoned).
 */
export async function getUploadedObjectMetadata(
  storageKey: string,
): Promise<{ size: number; mimeType: string } | null> {
  const admin = createAdminClient();
  const lastSlash = storageKey.lastIndexOf("/");
  const dir = storageKey.slice(0, lastSlash);
  const filename = storageKey.slice(lastSlash + 1);

  const { data, error } = await admin.storage.from(MATERIALS_BUCKET).list(dir, {
    search: filename,
    limit: 1,
  });
  if (error) throw error;

  const match = data.find((item) => item.name === filename);
  if (!match?.metadata) return null;
  return {
    size: Number(match.metadata.size),
    mimeType: String(match.metadata.mimetype),
  };
}

/** Short-lived signed URL for downloading/previewing a material — generated
 * fresh on every request after the caller has verified ownership. */
export async function createDownloadUrl(storageKey: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(storageKey, DOWNLOAD_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteStorageObject(storageKey: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(MATERIALS_BUCKET).remove([storageKey]);
  if (error) throw error;
}
