# StudyOS 배포 가이드 (출시 전 필수 설정)

이 문서는 **사람이 직접 실제 값을 넣고 실행해야 하는** 출시 전 작업을 정리한다.
코드로 이미 해결된 항목은 여기 없고, 운영자 조치가 필요한 것만 담는다.

---

## 1. 필수 환경변수 체크리스트

배포 플랫폼(예: Vercel Project Settings > Environment Variables)에 아래를 모두 설정한다.
값 형식과 발급처는 `.env.example`의 주석을 참고. **하나라도 비면 해당 기능이 실패**한다.
서버 부팅 시 `src/lib/env-check.ts`가 누락 변수를 로그로 경고한다(프로덕션은 error).

| 변수 | 미설정 시 영향 | 발급/생성처 |
| --- | --- | --- |
| `DATABASE_URL` | DB 연결 불가 → 앱 전체 실패 | Supabase > Database (pooled, 6543) |
| `DIRECT_URL` | 마이그레이션/generate 실패 | Supabase > Database (direct, 5432) |
| `AUTH_SECRET` | 세션 서명 불가 → 로그인 실패 | `openssl rand -base64 33` |
| `AUTH_URL` | 인증 콜백 + **SEO 절대 URL** 어긋남 | 실제 프로덕션 도메인 `https://...` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google 로그인 실패 | Google Cloud Console (아래 2절) |
| `GEMINI_API_KEY` | **AI 전 기능 실패** (문제/해설/오답DNA/교재/모의고사) | Google AI Studio |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase SDK 접근 실패 | Supabase > API |
| `ADMIN_SECRET` | 관리자 부트스트랩 로그인 불가 | `openssl rand -base64 32` |
| `ADMIN_SESSION_SECRET` | 관리자 세션 서명 불가 | `openssl rand -base64 32` |
| `ADMIN_BOOTSTRAP_EMAIL` | (선택) 기본 SUPER_ADMIN 이메일 | 운영자 지정 |

선택(설정 시 활성화):

| 변수 | 용도 |
| --- | --- |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 서버·클라이언트 에러 모니터링. 없으면 무동작 |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | 빌드 시 소스맵 업로드(선택). 토큰 없으면 업로드만 생략 |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` + 슬롯 4종 | AdSense 광고. 승인 후 입력. 미설정 시 placeholder |
| `PROBLEM_IMPORT_TOKEN` | 문제 import API 사용 시 |

---

## 2. Google OAuth — 프로덕션 리디렉션 URI 등록

1. [Google Cloud Console > API 및 서비스 > 사용자 인증 정보](https://console.cloud.google.com/apis/credentials) 접속.
2. 사용 중인 **OAuth 2.0 클라이언트 ID**를 연다(없으면 생성: 유형 "웹 애플리케이션").
3. **승인된 리디렉션 URI**에 다음을 추가한다(도메인은 실제 값으로 교체):
   - `https://<프로덕션 도메인>/api/auth/callback/google`
   - (프리뷰/스테이징을 쓰면 해당 도메인도 각각 추가)
4. **승인된 자바스크립트 원본**에 `https://<프로덕션 도메인>` 추가.
5. 저장 후 클라이언트 ID/시크릿을 `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`에 설정.

> `AUTH_URL`과 실제 접속 도메인, 등록한 리디렉션 URI가 **정확히 일치**해야 로그인이 된다.

---

## 3. DB 마이그레이션 — 배포 빌드 커플링 주의

`npm run build` = `prisma migrate deploy && next build`. 즉 **배포 빌드가 실제 DB에
마이그레이션을 적용**한다. 프로덕션에 그대로 돌리기 전에 스테이징에서 리허설한다.

권장 절차(운영 DB에 영향을 주지 않는 읽기 확인부터):

```bash
# 1) 스테이징 DB를 가리키는 env로 상태 확인(읽기 전용 — 무엇이 적용될지 파악)
npm run migrate:status

# 2) 스테이징에 실제 적용해 리허설
npm run migrate:deploy

# 3) 앱 스모크 테스트 후 프로덕션 배포 진행
```

- 이 저장소의 세션(개발/CI)에서는 **운영 DB에 영향을 주는 명령을 실행하지 않는다.**
- `migrate:status`는 읽기 전용이지만 DB 접속이 필요하므로, 반드시 **스테이징 env**로 실행한다.

---

## 4. 출시 전 남은 운영자 조치 (코드 밖)

- [ ] `src/config/site.ts`의 `CONTACT_EMAIL`(현재 `support@studyos.app` 플레이스홀더)을
      **실제 운영 도메인 메일**로 교체. 문의 페이지·정지 안내·약관/개인정보에 모두 반영됨.
- [ ] 법적 문서(`src/features/legal/documents.ts`)의 `[추후 입력]` 항목 채우기:
      상호·대표자·사업자등록번호·주소·통신판매업 신고번호, 개인정보 보호책임자, 수탁사 계약 정보 등.
      (결제 연동 확정 후 PG/환불 세부도 보완)
- [ ] AdSense 계정 생성 → 심사 → 승인 후 `public/ads.txt`의 pub ID 및 env 슬롯 입력.
- [ ] Sentry 프로젝트 생성 후 DSN을 env에 설정(선택이지만 프로덕션 권장).
- [ ] Vercel Web Analytics 대시보드에서 Analytics 활성화.

---

## 5. 배포 후 검증

- [ ] 로그인(Google/이메일) 정상 동작
- [ ] AI 문제 생성 1건 실제 성공(=`GEMINI_API_KEY` 유효)
- [ ] `/robots.txt`, `/sitemap.xml`이 **프로덕션 도메인** 절대 URL로 출력되는지
- [ ] 주요 페이지에서 브라우저 콘솔에 CSP 위반 리포트가 없는지 확인(아래 6절)
- [ ] 유지보수 모드 on/off, 관리자 부트스트랩 로그인

---

## 6. CSP(Content-Security-Policy) 전환 절차

현재 `next.config.ts`는 CSP를 **Report-Only**로 적용한다(차단하지 않고 위반만 보고).

1. 배포 후 로그인/대시보드/문제 풀이/요금제 페이지를 돌며 DevTools 콘솔의
   `Content-Security-Policy-Report-Only` 위반 메시지를 수집한다.
2. 위반이 있으면 `next.config.ts`의 `contentSecurityPolicy` 허용 목록을 보정한다
   (특히 AdSense 실제 적용 시 추가 도메인이 필요할 수 있음).
3. 위반이 없음을 확인하면 헤더 키를 `Content-Security-Policy-Report-Only` →
   `Content-Security-Policy`로 바꿔 **강제(enforce)** 모드로 전환한다.
