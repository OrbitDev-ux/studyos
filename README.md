# StudyOS

학생을 위한 올인원 공부 관리 플랫폼. 오늘의 목표, 공부 시간, Todo, 연속 공부일(Streak)을
한 화면에서 관리합니다.

## 기술 스택

- **Frontend**: Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Radix 기반)
- **Backend**: Next.js Route Handlers · Server Actions · Prisma 7 (PostgreSQL, `@prisma/adapter-pg`)
- **인증**: Auth.js v5 · Google OAuth
- **폼**: React Hook Form · Zod
- **다크모드**: next-themes

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수

`.env.example`을 `.env`로 복사한 뒤 값을 채웁니다.

```bash
cp .env.example .env
```

| 변수                                    | 설명                                                                                                                                                      |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | PostgreSQL 접속 문자열                                                                                                                                    |
| `AUTH_SECRET`                           | `npx auth secret` 또는 `openssl rand -base64 33`로 생성                                                                                                   |
| `AUTH_URL`                              | 로컬 개발 시 `http://localhost:3000`                                                                                                                      |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 발급. 승인된 리디렉션 URI에 `{AUTH_URL}/api/auth/callback/google` 등록 필요 |

### 3. 데이터베이스

로컬에 PostgreSQL이 떠 있어야 합니다.

```bash
npm run prisma:migrate   # 스키마 마이그레이션 적용
npm run prisma:generate  # Prisma Client 생성 (src/generated/prisma)
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속 시 로그인 여부에 따라 `/login` 또는
`/dashboard`로 리다이렉트됩니다. 신규 사용자는 첫 로그인 시 기본 과목(수학/영어/국어/과학)이
자동으로 생성됩니다.

## 스크립트

| 명령                    | 설명                   |
| ----------------------- | ---------------------- |
| `npm run dev`           | 개발 서버              |
| `npm run build`         | 프로덕션 빌드          |
| `npm run typecheck`     | TypeScript 타입 체크   |
| `npm run lint`          | ESLint                 |
| `npm run format`        | Prettier 포맷팅        |
| `npm run prisma:studio` | Prisma Studio (DB GUI) |

## 폴더 구조

```
src/
  app/
    (auth)/login/       비인증 라우트
    (app)/               인증 필요 라우트 (사이드바 셸 공유)
      dashboard/  todos/  subjects/  stats/
    api/auth/[...nextauth]/
  components/
    ui/                  shadcn/ui 원자 컴포넌트
    layout/              사이드바·헤더 등 앱 셸
    providers/           Theme 등 전역 Provider
  features/              기능별 모듈 (컴포넌트·서버 액션·쿼리·zod 스키마)
    dashboard/  todos/  subjects/  goals/  study-sessions/  statistics/  auth/
  lib/                   prisma 클라이언트, auth 설정, 날짜/포맷 유틸
  types/                 전역 타입 (Auth.js 세션 확장 등)
  config/                앱 전역 설정 (사이트 정보, 내비게이션)
prisma/
  schema.prisma
  migrations/
```

새 기능은 대부분 `features/` 아래에 새 폴더를 추가하는 방식으로 확장됩니다. 예를 들어
AI 기능은 `features/ai/`, 친구·랭킹은 `features/social/`, 결제는 `features/billing/`으로
추가하면 기존 코드를 건드리지 않고 확장할 수 있도록 설계되어 있습니다.

## 데이터 모델

`User`(Auth.js) · `Subject` · `Todo` · `Goal`(수량형 일일 목표) · `StudySession`(공부 시간
기록, 통계·Streak의 단일 소스). 별도의 `Statistics` 테이블 없이 필요한 통계는 항상 쿼리
시점에 집계합니다 — 자세한 배경은 `prisma/schema.prisma` 커밋 이력 참고.

## StudyOS Dev (로컬 개발 환경)

`/dev`는 브라우저 IDE(파일 탐색기·에디터·터미널·git·Run/Preview)를 제공하지만, 실제 파일
읽기/쓰기·셸 실행·git 명령은 **사용자 자신의 컴퓨터**에서 동작하는 별도 프로세스인
Local Agent(`local-agent/`, CLI `studyos-dev`)가 수행합니다. StudyOS 서버(Vercel)는 절대
사용자의 셸을 직접 실행하지 않습니다 — 자세한 설계는
[`docs/STUDYOS_DEV.md`](docs/STUDYOS_DEV.md) · [`docs/LOCAL_AGENT.md`](docs/LOCAL_AGENT.md) ·
[`docs/SECURITY.md`](docs/SECURITY.md) 참고.

```bash
cd local-agent && npm install && npm run build
node dist/cli.js login      # 페어링 코드 발급 → /dev/pair 에서 승인
node dist/cli.js connect     # 로컬 에이전트 시작 (127.0.0.1 only)
```
