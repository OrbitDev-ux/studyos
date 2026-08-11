import { getDueReviewCount } from "@/features/review/queries";
import { getSocialNotificationCount } from "@/features/social/queries";
import type { AppNotification } from "@/features/notifications/types";

/**
 * 현재 사용자의 알림 피드를 구성한다.
 * 실데이터로 채워지는 타입만 반환한다:
 *  - review_due: 오늘 복습 대기(대시보드 히어로와 동일한 getDueReviewCount 재사용)
 *  - friend: 친구 요청 + 읽지 않은 DM
 *
 * 추후 연동 지점 — 전용 피드가 생기면 아래에 push한다:
 *  - battle_result: 배틀 종료 결과 (features/battle)
 *  - ai_generation_done: 문제/교재/리포트 AI 생성 완료 (features/ai)
 *  - weekly_report: 새 주간 리포트 발행 (features/ai)
 */
export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const [dueCount, socialCount] = await Promise.all([
    getDueReviewCount(userId),
    getSocialNotificationCount(userId),
  ]);

  const notifications: AppNotification[] = [];

  if (dueCount > 0) {
    notifications.push({
      id: "review_due",
      type: "review_due",
      title: `오늘 복습 ${dueCount > 99 ? "99+" : dueCount}개 대기`,
      description: "잊어버리기 전에 지금 복습하세요.",
      href: "/review",
    });
  }

  if (socialCount > 0) {
    notifications.push({
      id: "friend",
      type: "friend",
      title: `읽지 않은 소식 ${socialCount > 99 ? "99+" : socialCount}개`,
      description: "친구 요청·메시지를 확인하세요.",
      href: "/social",
    });
  }

  return notifications;
}
