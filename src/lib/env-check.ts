/**
 * 런타임 필수 환경변수 검증. 서버 부팅 시 1회(src/instrumentation.ts의 register)
 * 호출된다. 목적은 "env가 비어서 기능만 조용히 실패"하는 상황을 막고, 무엇이
 * 왜 깨지는지 부팅 로그에 명확히 남기는 것. (빌드/프리뷰를 깨지 않도록 throw
 * 대신 로그만 남긴다 — 프로덕션은 error, 그 외는 warn.)
 */
const REQUIRED: { key: string; breaks: string }[] = [
  { key: "DATABASE_URL", breaks: "DB 연결 — 앱 전체 동작 불가" },
  { key: "DIRECT_URL", breaks: "prisma migrate/generate" },
  { key: "AUTH_SECRET", breaks: "세션 서명 — 로그인 불가" },
  { key: "AUTH_URL", breaks: "인증 콜백 + SEO 절대 URL(robots/sitemap/OpenGraph/JSON-LD)" },
  { key: "AUTH_GOOGLE_ID", breaks: "Google 로그인" },
  { key: "AUTH_GOOGLE_SECRET", breaks: "Google 로그인" },
  { key: "NEXT_PUBLIC_SUPABASE_URL", breaks: "Supabase SDK 접근" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", breaks: "Supabase SDK 접근" },
  { key: "ADMIN_SECRET", breaks: "관리자 부트스트랩 로그인" },
  { key: "ADMIN_SESSION_SECRET", breaks: "관리자 세션 서명" },
];

/** The AI key required depends on the selected provider (AI_PROVIDER, default
 * "groq"). Keeps the boot log accurate for the active AI provider. */
function requiredAiKey(): { key: string; breaks: string } {
  const gemini = process.env.AI_PROVIDER?.trim().toLowerCase() === "gemini";
  return gemini
    ? { key: "GEMINI_API_KEY", breaks: "AI 전 기능 (AI_PROVIDER=gemini)" }
    : { key: "GROQ_API_KEY", breaks: "AI 전 기능 (AI_PROVIDER=groq, 문제/해설/오답 DNA/교재/모의고사)" };
}

export function assertRequiredEnv(): void {
  const required = [...REQUIRED, requiredAiKey()];
  const missing = required.filter((item) => !process.env[item.key]?.trim());
  if (missing.length === 0) return;

  const lines = missing.map((item) => `  - ${item.key}: 미설정 → ${item.breaks}`);
  const message = `[env-check] 필수 환경변수 ${missing.length}개 누락:\n${lines.join("\n")}`;

  if (process.env.NODE_ENV === "production") {
    console.error(message);
  } else {
    console.warn(message);
  }
}
