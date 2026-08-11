import * as Sentry from "@sentry/nextjs";

// 브라우저(클라이언트) 에러 모니터링. 클라이언트 번들에 들어가므로 공개용
// NEXT_PUBLIC_SENTRY_DSN을 사용한다. 없으면 완전 무동작(no-op).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

// App Router 클라이언트 네비게이션 트레이싱 훅.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
