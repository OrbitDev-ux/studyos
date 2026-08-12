/**
 * 앱 알림 모델 — 확장 가능한 타입 유니온.
 * 현재 실데이터로 채워지는 타입: `friend`(친구 요청·미읽음 DM), `review_due`(오늘 복습 대기).
 * 나머지 타입은 전용 백엔드 피드가 생기면 채운다(연동 지점: features/notifications/queries.ts).
 * 직렬화 가능한 순수 데이터만 담는다(아이콘/색 매핑은 클라이언트 컴포넌트가 담당).
 */
export type AppNotificationType =
  | "friend"
  | "review_due"
  | "support_reply"
  | "battle_result"
  | "ai_generation_done"
  | "weekly_report";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  description?: string;
  /** 클릭 시 이동 경로. */
  href: string;
};
