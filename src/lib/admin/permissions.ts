import type { AdminRole } from "@/generated/prisma/client";

// Higher number = more authority. Every permission check compares ranks
// rather than hard-coding role names, so adding a role later means editing
// only this table.
const ROLE_RANK: Record<AdminRole, number> = {
  MODERATOR: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export const ADMIN_ROLES: AdminRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "슈퍼 관리자",
  ADMIN: "관리자",
  MODERATOR: "운영자",
};

export function roleRank(role: AdminRole): number {
  return ROLE_RANK[role];
}

/** True when `role` is at least as authoritative as `minimum`. */
export function hasRole(role: AdminRole, minimum: AdminRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isSuperAdmin(role: AdminRole): boolean {
  return role === "SUPER_ADMIN";
}

// ─── Capability matrix ──────────────────────────────────────────────────────
// One named predicate per sensitive action, so pages/actions ask
// "can(role, ...)" instead of re-deriving the rule at each call site.

export const CAPABILITIES = {
  // User management — MODERATOR can moderate (ban), ADMIN+ can promote.
  banUser: "ADMIN",
  unbanUser: "ADMIN",
  promoteUser: "SUPER_ADMIN",
  // Admin management — SUPER_ADMIN only.
  manageAdmins: "SUPER_ADMIN",
  // Content & ops.
  manageAnnouncements: "ADMIN",
  viewLogs: "MODERATOR",
  // Support tickets — moderators and up can view/answer.
  manageSupport: "MODERATOR",
  // Lab (실험실) feature flags + analytics.
  manageLab: "ADMIN",
  manageSecurity: "ADMIN",
  manageSystem: "SUPER_ADMIN",
  manageAi: "ADMIN",
  // High-risk operations — super admin only.
  manageIpBans: "SUPER_ADMIN",
  managePrompts: "SUPER_ADMIN",
} as const satisfies Record<string, AdminRole>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: AdminRole, capability: Capability): boolean {
  return hasRole(role, CAPABILITIES[capability]);
}
