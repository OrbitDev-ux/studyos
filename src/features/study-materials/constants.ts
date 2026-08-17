/** Private Supabase Storage bucket for all users' material files (see migration
 * 20260817022502_study_materials — bucket-level file_size_limit/allowed_mime_types
 * mirror the constants below and are enforced by Supabase's own Storage server). */
export const MATERIALS_BUCKET = "study-materials";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

export type MaterialType = "PDF" | "TXT" | "MD" | "IMAGE";

/** Canonical MIME whitelist → our coarse `type`. Keep in sync with the
 * bucket's `allowed_mime_types` in the migration. */
export const ALLOWED_MIME_TYPES: Record<string, MaterialType> = {
  "application/pdf": "PDF",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
};

/** Short-lived — a downloaded/previewed signed URL is meant to be used
 * immediately, not stored or shared. */
export const DOWNLOAD_URL_TTL_SECONDS = 60;
