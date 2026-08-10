import { prisma } from "@/lib/prisma";
import { getRequestIp } from "@/lib/admin/context";

// Canonical action strings for the audit trail. Kept as a const map (not a
// free-form string at each call site) so the Logs page can offer a stable
// filter list and labels stay consistent.
export const ADMIN_ACTIONS = {
  LOGIN: "login",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  USER_BAN: "user_ban",
  USER_UNBAN: "user_unban",
  USER_PROMOTE: "user_promote",
  ADMIN_CREATE: "admin_create",
  ADMIN_DELETE: "admin_delete",
  ADMIN_ROLE_CHANGE: "admin_role_change",
  ANNOUNCEMENT_CREATE: "announcement_create",
  ANNOUNCEMENT_UPDATE: "announcement_update",
  ANNOUNCEMENT_DELETE: "announcement_delete",
  IP_BLOCK: "ip_block",
  IP_UNBLOCK: "ip_unblock",
  SESSION_CLEAR: "session_clear",
  CACHE_CLEAR: "cache_clear",
  MAINTENANCE_TOGGLE: "maintenance_toggle",
  AI_TOGGLE: "ai_toggle",
  AI_SETTINGS_UPDATE: "ai_settings_update",
  PROMPT_CREATE: "prompt_create",
  PROMPT_SAVE: "prompt_save",
  PROMPT_ROLLBACK: "prompt_rollback",
  PROMPT_TOGGLE: "prompt_toggle",
  PROMPT_DELETE: "prompt_delete",
  SETTING_UPDATE: "setting_update",
  PLAN_OVERRIDE_SET: "plan_override_set",
  PLAN_OVERRIDE_DISABLE: "plan_override_disable",
  ERROR: "error",
} as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[keyof typeof ADMIN_ACTIONS];

export const ACTION_LABELS: Record<string, string> = {
  login: "로그인",
  login_failed: "로그인 실패",
  logout: "로그아웃",
  user_ban: "사용자 정지",
  user_unban: "정지 해제",
  user_promote: "권한 변경",
  admin_create: "관리자 추가",
  admin_delete: "관리자 삭제",
  admin_role_change: "역할 변경",
  announcement_create: "공지 작성",
  announcement_update: "공지 수정",
  announcement_delete: "공지 삭제",
  ip_block: "IP 차단",
  ip_unblock: "IP 차단 해제",
  session_clear: "세션 초기화",
  cache_clear: "캐시 초기화",
  maintenance_toggle: "점검모드 전환",
  ai_toggle: "AI 전환",
  ai_settings_update: "AI 설정 변경",
  prompt_create: "프롬프트 생성",
  prompt_save: "프롬프트 저장",
  prompt_rollback: "프롬프트 롤백",
  prompt_toggle: "프롬프트 활성화 전환",
  prompt_delete: "프롬프트 삭제",
  setting_update: "설정 변경",
  plan_override_set: "플랜 오버라이드 설정",
  plan_override_disable: "플랜 오버라이드 해제",
  error: "오류",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

type LogInput = {
  adminId?: string | null;
  action: AdminAction;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown> | string;
  ip?: string;
};

/** Append one row to the audit trail. Never throws into the caller — a failed
 * log write must not roll back the admin action it was recording. */
export async function logAdminActivity(input: LogInput): Promise<void> {
  try {
    const ip = input.ip ?? (await getRequestIp());
    const detail =
      input.detail === undefined
        ? null
        : typeof input.detail === "string"
          ? input.detail
          : JSON.stringify(input.detail);

    await prisma.adminActivityLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        detail,
        ip,
      },
    });
  } catch (err) {
    console.error("Failed to write admin activity log", err);
  }
}
