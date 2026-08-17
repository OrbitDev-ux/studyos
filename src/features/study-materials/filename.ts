import {
  ALLOWED_MIME_TYPES,
  type MaterialType,
} from "@/features/study-materials/constants";

const MAX_FILENAME_LENGTH = 150;

/** Browsers/OSes report an empty or generic type for some extensions
 * (.md especially) — normalize to the extension when the browser was vague,
 * but never override a specific, meaningful declared type. */
const AMBIGUOUS_MIME_TYPES = new Set(["", "application/octet-stream"]);

const EXTENSION_MIME_FALLBACK: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

/**
 * Normalizes a browser-declared File.type into a concrete MIME type using
 * the filename extension as a fallback when the browser reported nothing
 * useful. Still just a hint for validation — final enforcement is the
 * whitelist check plus the Storage bucket's own allowed_mime_types.
 */
export function resolveMimeType(filename: string, declaredMimeType: string): string {
  if (!AMBIGUOUS_MIME_TYPES.has(declaredMimeType)) return declaredMimeType;
  return EXTENSION_MIME_FALLBACK[getExtension(filename)] ?? declaredMimeType;
}

/** Our coarse material `type`, or null if the MIME type isn't supported. */
export function deriveMaterialType(mimeType: string): MaterialType | null {
  return ALLOWED_MIME_TYPES[mimeType] ?? null;
}

// Anything NOT in this set gets replaced with "_". Letters/digits, dot,
// underscore, hyphen, space, and the Korean syllable block (common in
// StudyOS filenames like "수학 개념정리.pdf").
const SAFE_FILENAME_CHARS = /[^a-zA-Z0-9._\- ㄱ-ㆎ가-힣]/g;
const LEADING_DOT_OR_DASH = /^[.-]+/;

/**
 * Reduces a user-supplied filename to a single safe path segment: no path
 * separators, no control characters, bounded length. Used to build the
 * Storage object key (`{userId}/{materialId}/{sanitized name}`) — the
 * directory components are always server-generated, but the filename itself
 * comes from the client and must never let a user escape their own prefix
 * or inject a path.
 */
export function sanitizeFilename(filename: string): string {
  const safe = filename
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(SAFE_FILENAME_CHARS, "_")
    .replace(LEADING_DOT_OR_DASH, "")
    .trim();

  const result = safe.length > 0 ? safe : "file";
  return result.slice(0, MAX_FILENAME_LENGTH);
}
