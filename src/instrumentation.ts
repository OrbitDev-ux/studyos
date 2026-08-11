import * as Sentry from "@sentry/nextjs";
import { assertRequiredEnv } from "@/lib/env-check";

// Next.js 서버 부팅 훅. 런타임별 Sentry 설정을 로드하고, Node 런타임에서 필수
// 환경변수 검증을 1회 수행한다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    assertRequiredEnv();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// 서버 액션 / 라우트 핸들러 / RSC의 처리되지 않은 예외를 Sentry로 캡처.
export const onRequestError = Sentry.captureRequestError;
