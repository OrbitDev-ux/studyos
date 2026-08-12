import type { SupportTicketStatus, SupportTicketType } from "@/generated/prisma/client";

/**
 * Support ticket types — config-driven so a new type is added here (+ the Prisma
 * enum) without touching UI/logic. Labels/emoji are the Korean display text.
 */
export const SUPPORT_TYPES: { id: SupportTicketType; label: string; emoji: string }[] = [
  { id: "BUG", label: "버그 신고", emoji: "🐛" },
  { id: "FEATURE_REQUEST", label: "기능 제안", emoji: "💡" },
  { id: "PAYMENT", label: "결제/구독 문의", emoji: "💳" },
  { id: "ACCOUNT", label: "계정 문의", emoji: "🔐" },
  { id: "LEARNING", label: "학습 관련 문의", emoji: "📚" },
  { id: "OTHER", label: "기타", emoji: "💬" },
];

export const SUPPORT_TYPE_IDS = SUPPORT_TYPES.map((t) => t.id) as [
  SupportTicketType,
  ...SupportTicketType[],
];

export const SUPPORT_TYPE_LABEL = Object.fromEntries(
  SUPPORT_TYPES.map((t) => [t.id, `${t.emoji} ${t.label}`]),
) as Record<SupportTicketType, string>;

export const SUPPORT_STATUS_IDS = [
  "OPEN",
  "IN_PROGRESS",
  "ANSWERED",
  "CLOSED",
] as [SupportTicketStatus, ...SupportTicketStatus[]];

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: "답변 대기",
  IN_PROGRESS: "처리 중",
  ANSWERED: "답변 완료",
  CLOSED: "종료",
};

/** Badge tone per status (maps to existing Badge variants). */
export const SUPPORT_STATUS_VARIANT: Record<
  SupportTicketStatus,
  "default" | "secondary" | "outline"
> = {
  OPEN: "secondary",
  IN_PROGRESS: "default",
  ANSWERED: "outline",
  CLOSED: "outline",
};
