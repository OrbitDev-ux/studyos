import * as Sentry from "@sentry/nextjs";

// Edge 런타임(미들웨어 등) 에러 모니터링. server config와 동일 정책이며 DSN이
// 없으면 완전 무동작(no-op).
const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
