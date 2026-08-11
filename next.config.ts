import { dirname } from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Content-Security-Policy — 처음에는 Report-Only로 도입한다. Report-Only는 아무
// 것도 차단하지 않고 위반만 브라우저 콘솔/리포트로 남기므로, 실제 트래픽에서
// 위반을 관찰한 뒤 안전하게 강제(enforce) 모드로 전환할 수 있다.
// 허용 출처 근거:
//  - script/frame: Google AdSense(googlesyndication/doubleclick/google),
//    Vercel Analytics(va.vercel-scripts.com). Next.js는 부트스트랩 인라인
//    스크립트가 있어 'unsafe-inline'이 필요하다(nonce 도입 전까지).
//  - connect: Supabase(REST/Realtime), Sentry(ingest), Vercel, AdSense.
//  - img: 사용자 아바타(Google/Supabase 등 https 임의 출처) 허용.
//  - font: Geist는 next/font로 셀프 호스팅되므로 외부 폰트 도메인 불필요.
//  - Google OAuth는 전체 페이지 리다이렉트라 CSP 영향을 받지 않고, Gemini는
//    서버사이드 호출이라 브라우저 CSP와 무관하다.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://va.vercel-scripts.com https://pagead2.googlesyndication.com",
  "frame-src 'self' https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Baseline security headers applied to every response. HSTS only takes effect
  // over HTTPS (browsers ignore it on http://localhost).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Report-Only: 위반을 관찰만 하고 차단하지 않는다. 트래픽에서 위반이
          // 없음을 확인한 뒤 헤더 키를 "Content-Security-Policy"로 바꿔 강제한다.
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

// Sentry 래핑. source map 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 수행되므로,
// 토큰이 없는 로컬/CI 빌드에서는 업로드를 건너뛰고 빌드가 정상 완료된다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
