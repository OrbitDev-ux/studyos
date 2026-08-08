import { z } from "zod";

/** Display nickname reuses `User.name`. Not globally unique — it is a display
 * name (Google sign-in also fills `name`), matching the existing schema where
 * `name` has no unique constraint. Validation below runs server-side. */
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
export const BIO_MAX = 60;

// Letters (incl. Hangul syllables & jamo), digits, spaces, and a small set of
// harmless punctuation. Rejects control chars, angle brackets, etc.
const NICKNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.\-]*$/u;

// Minimal built-in blocklist — the project has no shared profanity filter to
// reuse, so this stays intentionally small and lives in code rather than the
// DB. Extend as needed.
const BANNED_WORDS = ["시발", "씨발", "병신", "admin", "관리자"];

export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN, `닉네임은 최소 ${NICKNAME_MIN}자 이상이어야 합니다.`)
  .max(NICKNAME_MAX, `닉네임은 최대 ${NICKNAME_MAX}자까지 가능합니다.`)
  .regex(NICKNAME_PATTERN, "닉네임에 사용할 수 없는 문자가 포함되어 있습니다.")
  .refine(
    (value) => !BANNED_WORDS.some((word) => value.toLowerCase().includes(word)),
    "사용할 수 없는 단어가 포함되어 있습니다.",
  );

export const bioSchema = z
  .string()
  .trim()
  .max(BIO_MAX, `상태 메시지는 최대 ${BIO_MAX}자까지 가능합니다.`);

/** Avatar is stored as a URL (no upload/storage infra in this project; Google
 * sign-in already populates `image` with a remote URL). Only https URLs are
 * accepted, and the value is re-validated server-side so a client cannot inject
 * an arbitrary/unsafe URL (e.g. javascript:, data:, http:). */
export const avatarUrlSchema = z
  .string()
  .trim()
  .max(2048, "이미지 URL이 너무 깁니다.")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "https로 시작하는 올바른 이미지 URL을 입력해주세요.");

export const updateProfileSchema = z.object({
  nickname: nicknameSchema,
  // Empty string is allowed (clears the message).
  bio: bioSchema,
  // Empty string clears the avatar (falls back to initials); otherwise must be
  // a valid https URL.
  avatarUrl: z.union([z.literal(""), avatarUrlSchema]),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
