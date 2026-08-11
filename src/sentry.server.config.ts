import * as Sentry from "@sentry/nextjs";

// 서버(Node.js 런타임) 에러 모니터링. SENTRY_DSN이 없으면 SDK는 완전 무동작(no-op)
// 이 되어 로컬/미설정 환경에서 아무 부작용이 없다. DSN은 배포 환경에서만 주입한다.
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // 트레이스 샘플링은 비용 방지를 위해 낮게. 필요 시 배포에서 조정.
  tracesSampleRate: 0.1,
  // 개인정보 최소화: 기본 PII(쿠키/헤더/IP) 전송을 끈다.
  sendDefaultPii: false,
});
