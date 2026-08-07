import { z } from "zod";

// ─── Sign-in ────────────────────────────────────────────────────────────────

export const adminCodeSchema = z.object({
  code: z.string().min(1, "관리자 코드를 입력해주세요"),
});
export type AdminCodeValues = z.infer<typeof adminCodeSchema>;

export const adminCredentialsSchema = z.object({
  email: z.string().trim().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});
export type AdminCredentialsValues = z.infer<typeof adminCredentialsSchema>;

// ─── Admin management ─────────────────────────────────────────────────────────

// Literal tuple (not derived from ADMIN_ROLES) so the inferred type is the
// AdminRole union rather than a widened string, matching Prisma's enum.
const roleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

export const createAdminSchema = z.object({
  email: z.string().trim().email("이메일 형식이 올바르지 않습니다"),
  name: z.string().trim().max(60).optional().or(z.literal("")),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다").max(100),
  role: roleEnum,
});
export type CreateAdminValues = z.infer<typeof createAdminSchema>;

export const updateAdminRoleSchema = z.object({
  adminId: z.string().min(1),
  role: roleEnum,
});
export type UpdateAdminRoleValues = z.infer<typeof updateAdminRoleSchema>;

// ─── User management ──────────────────────────────────────────────────────────

export const banUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});
export type BanUserValues = z.infer<typeof banUserSchema>;

export const promoteUserSchema = z.object({
  userId: z.string().min(1),
  role: roleEnum,
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다").max(100),
});
export type PromoteUserValues = z.infer<typeof promoteUserSchema>;

// ─── Announcements ────────────────────────────────────────────────────────────

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(120),
  body: z.string().trim().min(1, "내용을 입력해주세요"),
  isPinned: z.boolean().default(false),
  publishNow: z.boolean().default(true),
  scheduledAt: z.string().optional().or(z.literal("")),
});
export type AnnouncementValues = z.infer<typeof announcementSchema>;

// ─── Security ─────────────────────────────────────────────────────────────────

export const blockIpSchema = z.object({
  ip: z
    .string()
    .trim()
    .min(3, "IP를 입력해주세요")
    .max(64)
    .regex(/^[0-9a-fA-F:.]+$/, "IP 형식이 올바르지 않습니다"),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  permanent: z.boolean().default(true),
  // Hours until the ban expires when not permanent (max 1 year).
  durationHours: z.number().int().positive().max(8760).optional(),
});
export type BlockIpValues = z.infer<typeof blockIpSchema>;

export const updateBanSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});
export type UpdateBanValues = z.infer<typeof updateBanSchema>;

// ─── AI settings ──────────────────────────────────────────────────────────────

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  model: z.string().trim().min(1).max(80),
});
export type AiSettingsValues = z.infer<typeof aiSettingsSchema>;
