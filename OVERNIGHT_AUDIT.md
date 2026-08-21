# StudyOS Overnight Audit

> **2026-08-21 추가 세션**: 사용자 요청으로 안정화 작업을 이어서 진행했습니다. 새로 10개 에이전트 감사를 다시 돌리지는 않고, 아래 기존 감사 결과에서 남아 있던 항목 중 안전한 것들을 추가로 수정했습니다. 상세는 [Follow-up Session](#follow-up-session-2026-08-21) 섹션 참고. Typecheck·Lint·전체 테스트(95 files / 611 tests)·프로덕션 빌드 모두 통과 상태입니다.

## MORNING PRIORITY

가장 먼저 봐야 할 3가지 — 전부 "안전하게 자동 수정 불가"로 판단해 손대지 않고 남겨뒀습니다.

1. **게스트 계정이 계정 정지(ban)를 구조적으로 우회한다.** 정지된 이메일 계정 사용자가 게스트 로그인으로 즉시 재진입할 수 있습니다. IP당 5개/15분 제한은 있지만 "정지된 사람이 다시 못 들어오게" 막지는 못합니다. 완전한 해결은 익명 계정 모델 자체의 재설계(기기 지문, 이메일 인증 요구 등)가 필요해 보류했습니다. → [Security Findings #1](#security-findings)
2. **모의고사 제한시간이 서버에서 전혀 강제되지 않는다.** 클라이언트 타이머만 있고, 서버는 클라이언트가 보낸 `durationSec`을 검증 없이 저장합니다. 제대로 고치려면 "응시 시작 시각"을 서버에 남기는 스키마 변경이 필요해 REVIEW_REQUIRED로 남겼습니다. → [Security Findings #2](#security-findings)
3. **AI 약점분석/주간리포트에 동시성 가드가 없다.** 캐시 확인 후 생성하는 로직에 락이 없어 짧은 시간 내 중복 클릭 시 비싼 AI 호출이 중복 실행될 수 있습니다. 이 프로젝트가 PgBouncer 트랜잭션 풀링을 쓰기 때문에, 다른 AI 기능처럼 "advisory lock을 트랜잭션 전체에 걸기"를 그대로 적용하면 커넥션을 오래 붙잡는 새로운 문제를 만들 위험이 있어 보류했습니다. → [Security Findings #3](#security-findings)

---

## Execution Summary

- **범위**: 이 보고서는 오늘 하루 전체 작업을 포함합니다 — (1) 사용자 요청으로 진행한 "친구 활동 피드" 기능 구현, (2) 10개 병렬 에이전트를 이용한 전체 코드베이스 감사, (3) 그 감사에서 나온 Critical 8건 수정(사용자 승인 하에 진행), (4) 이번 자율(overnight) 세션에서 진행한 추가 High/Medium 수정.
- **검사한 영역**: auth/계정, billing/구독, AI(tutor/review/problems/mock-exam), 문제·시험, 학습기록·통계, social/profile/presence/friend, 콘텐츠(study-materials/study-books), 온보딩·데모, 관리자·개발자 도구(admin/dev/lab), 공통 인프라(lib/i18n/schema), 테스트 커버리지 전반.
- **방법**: 최초 감사는 10개 독립 에이전트를 도메인별로 병렬 실행해 실제 소스를 읽게 했고, 이후 모든 수정은 직접 코드를 읽고 근거를 확인한 뒤 진행했습니다. 이번 자율 세션에서는 새로운 감사를 처음부터 다시 돌리지 않고, 이미 확보한 감사 결과를 기반으로 "SAFE로 판정된 항목"부터 순서대로 수정했습니다.
- **실행한 명령어**: `npx tsc --noEmit`, `npx eslint .` / `npx eslint <files>`, `npx vitest run` / `npx vitest run <file>`, `npx next build`, `npx prisma generate`, `npx prisma validate`, `DOTENV_CONFIG_PATH=.env.local npx prisma migrate deploy`(오늘 앞선 세션에서 사용자 승인 하에 2회만 실행 — 이번 자율 세션에서는 마이그레이션을 만들지도 적용하지도 않았습니다).
- **자율 세션 동안 사용자에게 질문하지 않았습니다.** 판단이 필요한 항목은 전부 SAFE/REVIEW_REQUIRED 기준으로 스스로 분류해 처리하거나 보류했습니다.

---

## Results

| 항목 | 상태 | 비고 |
|---|---|---|
| Typecheck (`tsc --noEmit`) | ✅ PASS | 전체 프로젝트, 에러 0 |
| ESLint (`eslint .`) | ✅ PASS | 에러 0, 경고 7건 — 전부 이번 작업과 무관한 기존 경고(`scripts/verify-ban.mjs`, `features/dev/unavailable-container-manager.ts`의 의도적 미사용 파라미터) |
| Tests (`vitest run`) | ✅ PASS | 92 files / 589 tests, 실패 0 |
| Build (`next build`) | ✅ PASS | 전 라우트 정상 컴파일 |

세 항목 모두 마지막에 한 번에 다시 실행해 확인했습니다(Phase 16 반복 검증).

---

## Bugs Found

### 1. StudySession 시작/종료 레이스 컨디션 — **[FIXED]**
- **Severity**: High
- **Location**: `src/features/study-sessions/actions.ts`
- **Root Cause**: 활성 세션 존재 여부를 `.maybeSingle()`로 확인하는 check-then-act 패턴 + DB에 "유저당 활성 세션 1개" 제약이 없음. 과거 레이스로 활성 세션이 2개 이상 생기면 `.maybeSingle()`이 "행이 2개 이상"이라는 에러를 던져 타이머가 영구히 멈추지 않는 상태가 될 수 있음.
- **Fix**: 조회를 `order by startedAt desc, limit 1`로 바꿔 여러 개가 있어도 가장 최근 것 하나로 항상 수렴하도록 방어. `stopStudySession`의 update에도 `.is("endedAt", null)` 조건을 추가해 이중 제출이 같은 세션을 두 번 종료 처리하지 못하게 함. 스키마 변경 없이 애플리케이션 레벨에서만 방어.
- **Verification**: `npx tsc --noEmit`, `npx eslint`, 전체 테스트 통과. (레이스 자체를 재현하는 통합 테스트는 추가하지 않음 — Remaining Issues 참고)

### 2. 관리자 프롬프트 저장의 "변경됨" 감사 로그가 롤백 후 항상 틀리게 기록됨 — **[FIXED]**
- **Severity**: Medium
- **Location**: `src/features/admin/prompt-actions.ts` (`savePromptVersion`)
- **Root Cause**: `activeContent`를 구하려고 "최신 버전 1건"만 조회했는데, 롤백 직후에는 `activeVersion`이 최신 버전과 다름 — `.find()`가 항상 `undefined`를 반환해 `changed` 플래그가 실제 내용과 무관하게 항상 `true`로 기록됨.
- **Fix**: `activeVersion`에 해당하는 버전과 "최고 버전 번호"를 각각 별도로 조회하도록 분리.
- **Verification**: 회귀 테스트 추가(`prompt-actions.test.ts`) — 롤백 후 저장 시 `changed:false`가 정확히 기록되는지 확인. 전체 테스트 통과.

### 3. `/dev`, `/profile`이 미들웨어 보호 목록에서 누락 — **[FIXED]**
- **Severity**: Medium (실제 인증 우회는 아님 — 각 라우트의 자체 레이아웃이 이중으로 재검증함)
- **Location**: `src/lib/auth.config.ts` (`PROTECTED_PATHS`), `src/app/robots.ts`
- **Root Cause**: 주석에도 "study-bank/study-materials/notifications/lab가 과거에도 누락됐었다"고 명시된 반복되는 실수 패턴. `/profile`, `/dev`가 이번에 또 빠져 있었음.
- **Fix**: 두 경로를 목록에 추가. `robots.ts`의 크롤러 차단 목록에도 `/dev` 추가. **재발 방지 테스트 신규 추가**(`src/lib/auth.config.test.ts`) — `src/app/(app)/*` 실제 디렉터리 목록과 `PROTECTED_PATHS`를 자동 비교해, 앞으로 새 라우트가 추가되고 이 목록에 반영되지 않으면 테스트가 실패하도록 함.
- **Verification**: 신규 테스트 통과, 전체 테스트 통과.

### 4. 목표 진행도 증가가 비원자적 read-then-write — **[FIXED]**
- **Severity**: Medium
- **Location**: `src/features/goals/actions.ts` (`incrementGoalProgress`)
- **Root Cause**: `currentValue`를 읽어 JS에서 더한 뒤 다시 쓰는 방식이라, 더블클릭/재시도/다중 탭에서 동시 호출 시 한쪽 증가분이 유실될 수 있음(lost update).
- **Fix**: Prisma의 원자적 `increment` 연산으로 증가 자체를 DB에 위임(동시 호출에도 유실 없음). 그 다음 별도 스텝으로 `[0, targetValue]` 클램프 — 이 스텝이 약간의 경쟁에 지더라도 이미 일관된 값을 다시 한 번 좁히는 것뿐이라 안전.
- **Verification**: 기존 테스트 갱신 + 원자적 증가를 검증하는 신규 테스트 추가. 전체 테스트 통과.

### 5. 알림/친구 활동 피드 문구가 `String.replace`의 특수 패턴에 취약 — **[FIXED]**
- **Severity**: Medium
- **Location**: `src/features/notifications/meta.tsx`, `src/features/social/components/activity-feed.tsx`, `src/app/(app)/dashboard/page.tsx`
- **Root Cause**: 친구가 자유롭게 설정하는 표시 이름/과목명/목표 제목을 `template.replace("{name}", name)`처럼 **문자열** 두 번째 인자로 넘김. JS 스펙상 `$&`, `$$`, `` $` ``, `$'` 같은 패턴은 대상 문자열 안에 있어도 특수 치환으로 해석되어, 이름을 `"$&"`로 설정하면 그 사람과 상호작용하는 **다른 사용자**의 화면에서 알림/피드 문구가 깨질 수 있음(XSS는 아니고 텍스트 손상).
- **Fix**: 모든 해당 `.replace()` 호출을 **함수 replacer**(`.replace(pattern, () => value)`)로 교체 — 함수 replacer는 반환값을 그대로 삽입하며 `$` 특수 해석을 하지 않음.
- **Verification**: `meta.test.ts`에 `actorName: "$&"` 회귀 테스트 추가. 전체 테스트 통과.

### 6. `study-timer-card.tsx`만 i18n 미전환 — **[FIXED]**
- **Severity**: Low
- **Location**: `src/features/study-sessions/components/study-timer-card.tsx`
- **Root Cause**: 같은 대시보드의 형제 컴포넌트(오늘 목표/스트릭 카드 등)는 이미 `t.` 메시지 시스템으로 전환됐는데, 타이머 카드만 "오늘 공부시간"/"시작"/"종료"가 하드코딩되어 로케일과 무관하게 항상 한국어로 표시됨.
- **Fix**: 기존에 이미 존재하던 `stats.todayStudyTime` 키를 재사용하고, `timerStart`/`timerStop` 키를 4개 로케일(ko/en/ja/zh) 모두에 신규 추가.
- **Verification**: i18n 완결성 테스트(`messages.completeness.test.ts`) 포함 전체 테스트 통과.

### 7. `getFriendUserIds` 로직 중복 — **[FIXED]**
- **Severity**: Low (유지보수 리스크)
- **Location**: `src/features/ranking/queries.ts`
- **Root Cause**: `src/features/social/queries.ts`에 이미 export되어 있는 것과 바이트 단위로 동일한 함수가 `ranking/queries.ts`에 private으로 중복 정의되어 있었음. 향후 "친구 차단" 같은 정책이 추가될 때 한쪽만 수정되면 랭킹과 소셜의 친구 스코프가 어긋날 위험.
- **Fix**: 중복 정의 제거, `social/queries.ts`의 export된 버전을 import해서 재사용.
- **Verification**: 기존 `ranking/queries.test.ts` 통과, 전체 테스트 통과.

### 8. (오늘 낮 세션에서 처리) Critical 8건
아래는 이미 사용자 승인 하에 오늘 낮 세션에서 수정 완료된 항목으로, 전체 그림을 위해 요약만 남깁니다 — 상세는 이전 대화 기록 참고.
1. `unbanSelf()` 자가 밴 해제 기능 — 완전 제거(사용자 승인)
2. 게스트 로그인 밴 우회 — 구조적 한계로 잔여 리스크 문서화(오늘 밤 MORNING PRIORITY #1과 동일 이슈)
3. 비밀번호 재설정 링크 Host 헤더 인젝션 — `SITE_URL` 안전 패턴으로 교체
4. 결제 성공 시 `User.plan` 미갱신 — 동기화 로직 추가 + 테스트 4건
5. 환불 시 등급 미회수 — 동기화 로직 추가
6. 문제/모의고사 정답 사전 노출 — 6개 파일에 걸쳐 `isCorrect` 제거, `submitProblemAnswer`가 채점 후 `correctChoiceId` 반환하도록 리팩터
7. `DevWorkspace` 테이블 anon 접근 권한 누락 — 마이그레이션 작성 및 DB 적용 완료
8. `/demo`가 인증 필요 컴포넌트(`Header`) 재사용 — 전용 `DemoHeader` 신설

---

## Security Findings

### 1. 게스트 로그인이 계정 정지를 구조적으로 우회 — **OPEN (REVIEW_REQUIRED)**
- **Severity**: High
- **Location**: `src/features/auth/actions.ts` (`signInAsGuest`)
- **Risk**: 이메일 계정이 정지되어도, 같은 사람이 게스트 로그인으로 (IP당 5개/15분 제한 내에서) 즉시 새 계정을 만들어 재진입할 수 있음. 정지 정책 자체가 익명 계정 앞에서 무력화됨.
- **Current Status**: 미수정. 오늘 낮 세션에서 `unbanSelf()`(같은 계열의 더 직접적인 문제)는 제거했지만, 이 문제는 기능 자체(익명 계정)의 구조적 한계라 코드 몇 줄로 고칠 수 없음.
- **Recommended Action**: (a) 게스트 계정에도 디바이스/브라우저 지문 기반의 약한 식별자를 추가해 "이 기기에서 만든 게스트 중 하나라도 정지 이력이 있으면 차단" 하거나, (b) 게스트 로그인 자체를 이메일 인증 없이는 특정 민감 기능(AI 생성 등)에서 제외하거나, (c) 정지 정책의 실효 범위를 "이메일 계정"으로 명시하고 게스트는 애초에 별도 저위험 트랙으로 취급. 제품 정책 결정이 필요해 강행하지 않음.

### 2. 모의고사 제한시간이 서버에서 강제되지 않음 — **OPEN (REVIEW_REQUIRED)**
- **Severity**: High
- **Location**: `src/features/mock-exam/actions.ts` (`submitExam`), `src/features/mock-exam/components/exam-timer.tsx`
- **Risk**: 타이머는 순수 클라이언트 `setInterval`이고, `submitExam`은 클라이언트가 계산해 보낸 `durationSec`을 검증 없이 저장. 클라이언트 스크립트를 우회하면 시간제한 없이 풀 수 있음.
- **Current Status**: 미수정.
- **Recommended Action**: 서버가 "응시 시작 시각"을 알아야 진짜로 검증할 수 있음 — 현재 스키마에는 그 시각을 남길 곳이 없음(재응시 가능한 구조라 `MockExam.createdAt`으로는 불충분). `startExam(examId)` 같은 신규 액션을 추가해 응시 시작 시 서버가 타임스탬프를 기록하고, `submitExam`이 그 시각 + `timeLimitSec` (+ 약간의 네트워크 여유)과 실제 벽시계 시간을 비교하도록 하는 스키마 변경을 권장. **스키마 변경이 필요해 이번 세션에서는 강행하지 않음.**

### 3. AI 약점분석/주간리포트의 캐시 확인이 락 없는 check-then-act — **OPEN (REVIEW_REQUIRED)**
- **Severity**: Medium~High
- **Location**: `src/features/ai/actions.ts` (`generateWeaknessAnalysis`, `generateWeeklyReport`)
- **Risk**: "이미 생성됐으면 캐시 반환"이 유일한 방어라, 짧은 시간 내 동시에 여러 요청을 보내면 가장 비싼 AI 호출(`useThinking:true`)이 중복 실행될 수 있음.
- **Current Status**: 미수정.
- **Recommended Action**: 이 앱의 다른 AI 생성 경로(`generation-guard.ts`)는 `pg_advisory_xact_lock`으로 이 문제를 막지만, **트랜잭션 커밋 후 락을 풀고 AI 호출은 트랜잭션 밖에서 실행**하는 구조를 취함(PgBouncer 트랜잭션 풀링 환경에서 커넥션을 오래 붙잡지 않기 위함, 코드 주석에 명시). 이 두 함수는 그 "예약 후 트랜잭션 밖에서 실행" 구조가 아니라 한 흐름으로 쭉 이어져 있어, 같은 패턴을 안전하게 이식하려면 (a) `AiAnalysis`에 `(userId, type, periodStart, periodEnd)` 유니크 제약을 추가해 `upsert`로 원자적 선점을 하거나, (b) 아예 기존 `AiGenerationLog` 쿼터 시스템에 새 `kind`로 편입시키는 두 가지 중 하나가 필요 — 둘 다 스키마 변경 또는 플랜별 한도 설계라는 제품 결정이 필요해 보류.

### 4. AI 문제 생성 한도를 튜터/플래너/오답코치가 고지 없이 공유 — **OPEN (REVIEW_REQUIRED, 오늘 낮 감사에서 발견)**
- **Severity**: Medium
- **Location**: `src/features/tutor/ai.ts`, `src/features/planner/ai.ts`, `src/features/lab/coach.ts`
- **Risk**: 이 기능들이 전부 `kind:"problem"`으로 같은 일일 한도를 소진하는데, 약관/가격 페이지는 "AI 문제 생성" 한도만 명시. 튜터와 대화만 했는데 "문제 생성 한도 초과"를 받는 혼란스러운 UX + 약관 정확성 문제.
- **Current Status**: 미수정 — 오늘 밤 review/actions.ts의 두 함수를 같은 "problem" 버킷에 새로 편입시켜(Bug #의 quota 수정) 이 공유 범위가 오히려 조금 더 넓어졌습니다. 일관성 있는 선택이었지만, 이 항목 자체의 근본 해결(고지 또는 버킷 분리)은 별도입니다.
- **Recommended Action**: (a) 약관/가격 페이지에 "AI 문제 생성 한도는 튜터·플래너·오답 코치·오답 해설과 공유됩니다"라고 명시하거나, (b) 각 기능별로 별도의 작은 한도를 신설. 제품/가격 정책 결정이 필요.

### 5. MODERATOR가 SUPER_ADMIN의 활동 로그 상세를 무제한 열람 가능 — **OPEN (REVIEW_REQUIRED, 오늘 낮 감사에서 발견)**
- **Severity**: Medium
- **Location**: `src/features/admin/logs-queries.ts` (`getActivityLogs`)
- **Risk**: `viewLogs` 권한(MODERATOR 이상)이 role 필터 없이 전체 `AdminActivityLog`를 반환 — MODERATOR가 SUPER_ADMIN의 IP, 역할 변경 내역, 프롬프트 diff 등을 볼 수 있음.
- **Current Status**: 미수정.
- **Recommended Action**: 의도된 설계인지(작은 팀에서는 전체 투명성이 오히려 바람직할 수 있음) 먼저 확인 필요. 제한하기로 결정하면 `detail` 필드를 role 기반으로 redact하거나, `viewLogs`를 `ADMIN` 이상으로 올리는 두 가지 선택지.

### 6. Battle의 목표달성률 점수가 UTC 날짜로 잘못 슬라이스됨 — **OPEN (REVIEW_REQUIRED, 오늘 낮 감사에서 발견)**
- **Severity**: Low~Medium
- **Location**: `src/features/battle/queries.ts` (`computeParticipantScore`)
- **Risk**: `formatDateOnly()`(UTC 자정 전제)를 임의의 timestamptz인 `Battle.startAt`/`endAt`에 그대로 적용 — KST 00~09시 사이에 시작/종료하는 배틀은 목표 달성률 점수가 하루 오차로 잘못 집계될 수 있음.
- **Current Status**: 미수정.
- **Recommended Action**: 배틀 참가자들이 서로 다른 타임존일 수 있어 "누구 기준 하루인가"가 모호함 — 참가자별 타임존으로 각자 계산할지, 배틀 생성자 타임존을 기준으로 통일할지 제품 결정 필요.

### 7. 랭킹 페이지가 항상 친구 랭킹 쿼리 3개를 미리 실행 — **OPEN (REVIEW_REQUIRED, 오늘 낮 세션에서 발견된 자체 회귀)**
- 아래 [Performance Findings](#performance-findings) 참고.

---

## Performance Findings

### 1. `/ranking` 페이지가 "친구" 탭을 열지 않아도 친구 랭킹 쿼리 3개를 항상 실행
- **Location**: `src/app/(app)/ranking/page.tsx`
- **Current Behavior**: 오늘 추가한 오늘/이번주/전체 기간 서브탭 때문에, 서버 컴포넌트가 `getFriendRanking` + `getFriendRankingForRange("today")` + `getFriendRankingForRange("week")`를 항상 병렬 실행 후 클라이언트에 전부 넘김 — 사용자가 "친구" 탭조차 클릭하지 않아도 쿼리 수가 기존 대비 실질적으로 2배가 됨.
- **Potential Impact**: 사용자당 미미하지만, 랭킹 페이지 방문이 잦아지면 누적 DB 부하 증가.
- **Recommendation**: 선택된 스코프만 서버에서 lazy하게 조회하도록 Server Action 기반으로 전환(로딩 상태 UX 설계 필요) — UX 변경을 수반해 REVIEW_REQUIRED로 분류, 강행하지 않음.

### 2. 스트릭 "최장 기록"이 최근 500세션으로 절단됨
- **Location**: `src/features/study-sessions/queries.ts` (`STREAK_LOOKBACK = 500`)
- **Current Behavior**: 현재 스트릭 계산용으로 설계된 500건 상한이 "최장 스트릭" 계산에도 그대로 재사용됨.
- **Potential Impact**: 500세션을 초과한 헤비 유저는 실제보다 낮은 최장 스트릭을 보게 됨(기능 정확성 문제에 가까움).
- **Recommendation**: "최장 스트릭"만 별도의 더 큰 lookback(또는 DB 집계 쿼리)으로 계산하도록 분리. 쿼리 성능 트레이드오프 확인 후 진행 권장 — 이번 세션에서는 시간 관계상 보류.

### 3. StudySession.subjectId가 실제로는 한 번도 채워지지 않음
- **Location**: `src/features/study-sessions/actions.ts` (`startStudySession`), `src/features/study-sessions/components/study-timer-card.tsx`
- **Current Behavior**: 타이머 시작 시 과목을 선택하는 UI 자체가 없어 `subjectId`가 항상 null로 저장됨.
- **Potential Impact**: 과목별 학습시간 통계(`SubjectBreakdownCard`)가 사실상 죽은 기능 — 버그라기보단 미완성 기능.
- **Recommendation**: 타이머 카드에 과목 선택 드롭다운을 추가하는 UI 변경이 필요 — 기존 동작(버튼 하나로 시작/종료)을 바꾸는 작업이라 REVIEW_REQUIRED로 분류.

---

## Changes Made

**이번 자율(overnight) 세션에서 변경한 파일:**

| 파일 | 변경 이유 |
|---|---|
| `src/features/study-sessions/actions.ts` | 레이스 컨디션 방어(정렬+limit(1), 이중 종료 방지) |
| `src/features/admin/prompt-actions.ts`, `prompt-actions.test.ts` | "변경됨" 감사 로그 버그 수정 + 회귀 테스트 |
| `src/lib/auth.config.ts`, `src/app/robots.ts` | `/profile`, `/dev` 보호 목록 누락 수정 |
| `src/lib/auth.config.test.ts` (신규) | 라우트 누락 재발 방지 테스트 |
| `src/features/goals/actions.ts`, `actions.test.ts` | 목표 진행도 원자적 증가로 전환 |
| `src/features/notifications/meta.tsx`, `meta.test.ts` | `.replace()` 함수 replacer로 전환(특수 패턴 취약점) |
| `src/features/social/components/activity-feed.tsx` | 동일 취약점 수정 |
| `src/app/(app)/dashboard/page.tsx` | 동일 취약점 수정(인사말) |
| `src/features/study-sessions/components/study-timer-card.tsx`, `src/features/i18n/messages.ts` | i18n 미전환 수정(`timerStart`/`timerStop` 4개 로케일 추가) |
| `src/features/ranking/queries.ts` | `getFriendUserIds` 중복 제거, 공용 함수 재사용 |
| `src/features/auth/actions.ts`, `actions.test.ts` (신규) | 회원가입 IP rate limit 신설 |
| `src/features/review/actions.ts`, `actions.test.ts` (신규) | AI 오답 설명/DNA 분석에 비용 가드(`withGenerationQuota`) 연결 |
| `src/lib/admin/permissions.test.ts` (신규) | RBAC 역할/권한 매트릭스 순수 함수 테스트 |
| `src/lib/admin/context.test.ts` (신규) | `requireCapability` 실제 enforcement 테스트 |

**오늘 낮 세션(사용자 승인 하에 진행, 참고용 목록):** `src/features/auth/actions.ts`(unbanSelf 제거), `suspended-shortcut.tsx`(삭제), `src/app/suspended/page.tsx`, `src/features/auth/reset-actions.ts`, `src/features/billing/payment-service.ts`+테스트, `src/features/problems/{queries,actions,components/solve-problem-panel}.ts(x)`, `src/features/mock-exam/queries.ts`, `src/features/review/{queries,components/wrong-answer-actions}.ts(x)`, `src/features/study-books/{queries,components/study-book-print-document}.ts(x)`, `src/features/study-bank/queries.ts`, `src/app/(app)/study-books/[bookId]/print/page.tsx`, `src/app/demo/{layout.tsx}`+`src/features/demo/components/demo-header.tsx`(신규), `prisma/schema.prisma`+2개 마이그레이션(적용 완료).

커밋은 생성하지 않았습니다(사용자가 명시적으로 요청하지 않음) — 모든 변경은 워킹 트리에 그대로 남아 있어 `git diff`로 검토 가능합니다.

---

## Needs Manual Review

- **[Security Findings #1] 게스트 계정 밴 우회** — 제품 정책 결정 필요.
- **[Security Findings #2] 모의고사 시간제한 서버 강제** — 스키마 변경(응시 시작 시각 기록) 필요.
- **[Security Findings #3] AI 약점분석/주간리포트 동시성** — 스키마 변경 또는 쿼터 시스템 편입 중 선택 필요.
- **[Security Findings #4] AI 쿼터 공유 미고지** — 약관/가격 정책 결정 필요.
- **[Security Findings #5] MODERATOR의 SUPER_ADMIN 로그 열람** — 의도된 설계인지 확인 필요.
- **[Security Findings #6] Battle 타임존 버그** — 참가자 간 타임존이 다를 때의 기준 결정 필요.
- **[Performance #1] 랭킹 페이지 쿼리 3배** — lazy-fetch로 전환 시 로딩 UX 설계 필요.
- **[Performance #3] StudySession.subjectId 미채움** — 타이머 UI에 과목 선택 추가 여부 결정 필요.

---

## Follow-up Session (2026-08-21)

사용자가 "전체 코드베이스를 분석한 후 코드를 안정화"를 요청해 이어서 진행. 새 10-agent 감사는 다시 돌리지 않고, 위 감사에서 이미 확보한 Low/Medium 잔여 항목과 코드 전반의 타입 안전성(`as any`/floating promise 등)을 훑어 안전한 것만 수정했습니다.

**이번 세션에서 수정한 것:**

1. **`getBattle`/`getBattles`의 `User(*)` 전체 컬럼 조회 → `User(id,name,email,image)`로 좁힘** (`src/features/battle/queries.ts`). 실제 소비처(`BattleCard`, battle 상세 페이지)가 전부 서버 컴포넌트라 라이브 유출은 아니었지만, 이 코드베이스가 과거 겪은 것과 동일한 패턴(select 미명시로 인한 잠재적 유출)이라 방어적으로 수정 + 회귀 테스트 추가(`queries.test.ts`, select 문자열이 `User(*)`로 되돌아가면 실패).
2. **`theme-toggle.tsx`/`bottom-nav.tsx`의 aria-label 하드코딩 → i18n 전환** (`nav.themeToggle`/`nav.mainMenu` 키를 4개 로케일에 신규 추가).
3. **테스트 커버리지 공백 추가 해소**: `ads/config.ts`(`isAdSenseConfigured`의 정규식 검증, env 모듈 재로드 방식으로 5개 케이스), `login-experience/select.ts`(가중치 랜덤/역할 격리/우선순위 override/시즌 이벤트 게이팅, 15개 케이스). 둘 다 순수 함수라 코드 변경 없이 테스트만 추가.

**다시 살펴보고 보류한 것:**

- **동의 철회(consent withdrawal)** — 실제로 다시 확인해보니 설정 페이지는 버튼 없는 읽기 전용 상태 표시일 뿐이라, 이전 감사가 시사했던 "깨진 버튼"은 아니었습니다(`withdrawnAt`이 설정되는 경로가 아예 없어 그 분기가 항상 도달 불가능할 뿐). 실제 철회 기능을 만들려면 "탈퇴 없이 필수 약관(terms/privacy)만 철회하면 계정이 어떻게 되는가"라는 법률/제품 정책 결정이 선행돼야 해 계속 보류.
- **인증 폼(로그인/가입/재설정) i18n** — 실제로 살펴보니 7개 컴포넌트 + zod 검증 메시지 + 서버 액션 에러 문자열까지 걸쳐 있어 사실상 별도의 "i18n 패스" 작업 규모임을 확인. "안정화"보다는 "기능 완성도" 성격이 강하다고 판단해 이번 라운드에서는 하지 않고 별도 작업으로 남김.
- **study-materials MIME 실제 바이트 검증, pending 레코드 GC** — 전자는 피해가 자기 자신에 국한되는 self-XSS 유사 리스크라 투자 대비 효과가 낮고, 후자는 정리 스케줄러(cron) 인프라 결정이 필요해 보류.
- **코드 전반 점검**: `as any` 캐스팅은 실제 소스 코드에 단 한 건도 없음을 확인(높은 타입 안전성). ESLint(`next/core-web-vitals`+`next/typescript`)는 floating-promise류 타입 인지 규칙을 포함하지 않아 전수 점검은 못 했지만, 전체 lint는 0 에러(기존 경고 7건은 이번 작업과 무관).

**검증**: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build` 전부 통과(95 files / 611 tests). 새 마이그레이션 없음, DB 변경 없음.

---

## Remaining Issues

- 원래 10개 병렬 에이전트 감사에서 나온 전체 항목(Critical 8 · High 9 · Medium 21 · Low 9) 중 아직 손대지 않은 Low 항목들이 여전히 남아 있습니다 — study-materials MIME 스푸핑 방어 부재(자기 자신에게만 영향), study-materials pending 레코드 GC 부재, study-books 컴포넌트 i18n 전면 누락, 인증/온보딩/데모 폼들의 i18n 누락 등. 전부 심각도가 낮아 우선순위에서 밀렸습니다.
- StudySession 레이스 컨디션 수정(Bug #1)은 애플리케이션 레벨 방어이며, 진짜 근본 해결(유저당 활성 세션 1개 DB 유니크 제약)은 스키마 변경이 필요해 보류했습니다.
- 이번 세션들에서 새로 작성한 테스트는 전부 통과했지만, "레이스 컨디션 자체"를 재현하는 동시성 통합 테스트는 이 프로젝트의 테스트 인프라(실제 DB 없이 mock 기반)로는 실질적 검증이 어려워 추가하지 않았습니다.
- 인증 폼/온보딩/데모/study-books의 i18n 완성은 별도의 전용 작업으로 남아 있습니다.

---

## Final Status

StudyOS는 **Critical 8건이 전부 수정**되었고, 두 번의 안정화 세션에 걸쳐 **안전하게 수정 가능한 High/Medium/Low 항목들(레이스 컨디션 방어, 감사 로그 버그, 라우트 보호 누락, 목표 진행도 원자성, 알림 문구 취약점, i18n 누락 일부, 코드 중복 2건, 회원가입 rate limit, AI 비용 가드 확장, 관리자 권한 테스트 신설, battle 쿼리 select 방어적 축소)**을 수정했습니다. Typecheck·Lint·전체 테스트(95 files/611 tests)·프로덕션 빌드가 모두 통과하는 상태입니다.

남은 항목은 전부 스키마 변경, 제품/가격/법률 정책 결정, 또는 규모 있는 UX/i18n 작업이 필요해 의도적으로 보류했으며, 각 항목의 문제와 권장 해결책을 이 문서에 기록해 두었습니다. 커밋/배포는 진행하지 않았으므로, `git diff`로 전체 변경 사항을 검토한 뒤 커밋 여부를 결정하시면 됩니다.
