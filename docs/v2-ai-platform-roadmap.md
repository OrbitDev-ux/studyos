# StudyOS 2.0 — AI 학습 플랫폼 확장 로드맵

MVP(인증/대시보드/Todo/과목/공부시간/통계)는 손대지 않고, `src/features/` 아래에 새 모듈을
추가하는 방식으로만 확장한다. 기존 커밋 이력·스키마·라우트는 그대로 유지된다.

---

## 1. 전체 확장 로드맵

의존성 순서대로 9단계. 각 단계는 그 자체로 데모 가능한 단위이며, 뒷 단계는 앞 단계가 만든
데이터 모델을 재사용한다(중복 모델링 없음).

| 단계 | 내용                                                            | 의존성                    |
| ---- | --------------------------------------------------------------- | ------------------------- |
| 1    | AI 공통 인프라 (`features/ai` 클라이언트, 프롬프트, zod 스키마) | 없음                      |
| 2    | `features/problems` — AI 문제 생성/저장/즐겨찾기                | 1                         |
| 3    | `features/review` — 오답노트                                    | 2 (문제 필요)             |
| 4    | `features/mock-exam` — 모의고사(문제 재사용, OMR, 채점)         | 2                         |
| 5    | AI Tutor 확장 — 오답 분석/취약 단원/리포트                      | 3, 4 (분석할 데이터 필요) |
| 6    | 대시보드 카드 통합 (오늘 추천 문제/복습/모의고사)               | 2, 3, 4                   |
| 7    | `features/social` — 친구/DM                                     | 없음 (병렬 가능)          |
| 8    | `features/ranking` — 랭킹                                       | 7 (친구 스코프용)         |
| 9    | `features/battle` — 공부 배틀                                   | 7                         |

**근거**: Problem/Question이 오답노트·모의고사·AI 분석의 공통 기반이라 가장 먼저 온다.
소셜/랭킹/배틀 트랙은 학습 트랙과 데이터 의존이 거의 없어 병렬로 진행 가능하지만, 우선순위(7절)에서는
학습 루프(문제→복습→분석)를 먼저 완성한 뒤 착수하는 순서를 권장한다.

---

## 2. 새로운 폴더 구조

```
src/
  app/(app)/
    problems/page.tsx
    mock-exam/
      page.tsx                # 목록/생성
      [examId]/page.tsx       # 응시 화면 (OMR + 타이머)
      [examId]/result/page.tsx
    review/page.tsx
    ranking/page.tsx
    battle/
      page.tsx
      [battleId]/page.tsx
  app/api/ai/
    problems/generate/route.ts   # 스트리밍 전용 (5절 참고)
    mock-exam/generate/route.ts
    analysis/generate/route.ts

  features/
    ai/                       # 공통 AI 인프라 + AI Tutor
      client.ts
      prompts/
        problem-generation.ts
        answer-explanation.ts
        weakness-analysis.ts
        report-generation.ts
      schema.ts
      actions.ts              # generateWeaknessAnalysis, generateWeeklyReport
      queries.ts
      components/
        weekly-report-card.tsx
        weakness-summary-card.tsx

    problems/
      schema.ts
      actions.ts              # generateProblems, createProblem, toggleFavorite, deleteProblem
      queries.ts
      components/
        problem-generator-form.tsx
        problem-card.tsx
        problem-list.tsx

    mock-exam/
      schema.ts
      actions.ts              # generateMockExam, submitExam
      queries.ts
      components/
        exam-setup-form.tsx
        omr-sheet.tsx
        exam-timer.tsx
        exam-result-card.tsx

    review/
      actions.ts              # retryWrongAnswer, requestAiExplanation, markResolved
      queries.ts
      components/
        wrong-answer-list.tsx
        wrong-answer-card.tsx

    social/
      schema.ts
      actions.ts              # sendFriendRequest, respondToFriendRequest, sendMessage
      queries.ts
      components/
        friend-list.tsx
        conversation-panel.tsx

    ranking/
      queries.ts               # 조회 전용 — 랭킹은 항상 즉시 계산
      components/
        ranking-tabs.tsx

    battle/
      schema.ts
      actions.ts              # createBattle, inviteParticipant, respondToBattleInvite
      queries.ts
      components/
        battle-create-dialog.tsx
        battle-progress-bar.tsx
```

`src/config/nav.ts`에 항목을 추가하기만 하면 되고, 기존 4개 항목(대시보드/Todo/과목/통계)은
그대로 둔다.

---

## 3. Prisma 모델

**제약**: Prisma는 관계를 양방향으로 선언해야 하므로 `User`/`Subject`에 새 relation 필드를
추가하는 것은 불가피하다("기존 모델 수정 최소화"는 이 추가 라인만 의미하며, 기존 필드는 전혀
건드리지 않는다).

```prisma
enum QuestionType {
  MULTIPLE_CHOICE
  SHORT_ANSWER
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

model ProblemSet {
  id         String     @id @default(cuid())
  userId     String
  subjectId  String?
  title      String
  unit       String?
  difficulty Difficulty
  createdAt  DateTime   @default(now())

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject  Subject?  @relation(fields: [subjectId], references: [id], onDelete: SetNull)
  problems Problem[]

  @@index([userId])
}

model Problem {
  id           String       @id @default(cuid())
  userId       String
  problemSetId String?
  subjectId    String?
  type         QuestionType
  difficulty   Difficulty
  unit         String?
  prompt       String       @db.Text
  explanation  String?      @db.Text
  isFavorite   Boolean      @default(false)
  createdAt    DateTime     @default(now())

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  problemSet    ProblemSet?    @relation(fields: [problemSetId], references: [id], onDelete: SetNull)
  subject       Subject?       @relation(fields: [subjectId], references: [id], onDelete: SetNull)
  choices       Choice[]
  wrongAnswers  WrongAnswer[]
  examQuestions ExamQuestion[]

  @@index([userId])
  @@index([subjectId])
}

model Choice {
  id        String  @id @default(cuid())
  problemId String
  label     String  // "A", "B", ...
  content   String
  isCorrect Boolean @default(false)

  problem Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@index([problemId])
}

model MockExam {
  id           String   @id @default(cuid())
  userId       String
  subjectId    String?
  title        String
  style        String?  // 예: "평가원"
  timeLimitSec Int
  createdAt    DateTime @default(now())

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject   Subject?       @relation(fields: [subjectId], references: [id], onDelete: SetNull)
  questions ExamQuestion[]
  results   ExamResult[]

  @@index([userId])
}

model ExamQuestion {
  id        String @id @default(cuid())
  examId    String
  problemId String
  order     Int    @default(0)

  exam    MockExam @relation(fields: [examId], references: [id], onDelete: Cascade)
  problem Problem  @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@unique([examId, problemId])
  @@index([examId])
}

model ExamResult {
  id           String   @id @default(cuid())
  examId       String
  userId       String
  score        Int
  totalCount   Int
  correctCount Int
  durationSec  Int
  submittedAt  DateTime @default(now())

  exam    MockExam     @relation(fields: [examId], references: [id], onDelete: Cascade)
  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers ExamAnswer[]

  @@index([userId])
  @@index([examId])
}

model ExamAnswer {
  id               String  @id @default(cuid())
  examResultId     String
  problemId        String
  selectedChoiceId String?
  answerText       String?
  isCorrect        Boolean

  examResult ExamResult @relation(fields: [examResultId], references: [id], onDelete: Cascade)
  problem    Problem    @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@index([examResultId])
}

model WrongAnswer {
  id            String   @id @default(cuid())
  userId        String
  problemId     String
  source        String   // "problem" | "mock-exam"
  aiExplanation String?  @db.Text
  resolved      Boolean  @default(false)
  createdAt     DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  problem Problem @relation(fields: [problemId], references: [id], onDelete: Cascade)

  @@index([userId, resolved])
}

/// AI가 생성한 분석/리포트. 원문(마크다운)을 그대로 저장 — 재계산 비용이 크므로
/// Statistics와 달리 여기는 캐시 테이블을 의도적으로 둔다.
model AIAnalysis {
  id          String   @id @default(cuid())
  userId      String
  type        String   // "weakness" | "weekly-report"
  subjectId   String?
  content     String   @db.Text
  periodStart DateTime @db.Date
  periodEnd   DateTime @db.Date
  createdAt   DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subject Subject? @relation(fields: [subjectId], references: [id], onDelete: SetNull)

  @@index([userId, type])
}

model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  addresseeId String
  status      String   // "pending" | "accepted" | "blocked"
  createdAt   DateTime @default(now())

  requester User @relation("FriendRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee User @relation("FriendAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
}

model Conversation {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String @id @default(cuid())
  conversationId String
  userId         String

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  content        String   @db.Text
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}

model Battle {
  id           String   @id @default(cuid())
  creatorId    String
  metric       String   // "study_time" | "todo_count" | "goal_progress"
  durationDays Int
  startAt      DateTime
  endAt        DateTime
  status       String   // "pending" | "active" | "finished"
  createdAt    DateTime @default(now())

  creator      User                @relation("BattleCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  participants BattleParticipant[]
}

model BattleParticipant {
  id       String @id @default(cuid())
  battleId String
  userId   String
  status   String // "invited" | "accepted" | "declined"
  score    Int    @default(0)

  battle Battle @relation(fields: [battleId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([battleId, userId])
}
```

**의도적으로 만들지 않은 모델**

- **`Rank`**: 랭킹은 항상 `StudySession`/`ExamResult`/`Todo`에서 즉시 집계한다(MVP의 "Statistics
  테이블 없음" 원칙과 동일). 랭킹 계산이 무거워지면 그때 캐시 테이블을 추가해도 스키마가 깨지지
  않는다.
- **학교 랭킹**: 별도 모델 대신 `User.school String?` 컬럼 하나만 추가하는 것으로 충분하다.
- **`AIAnalysis`만 예외적으로 캐시 테이블**: AI 호출 비용이 크고 결과가 마크다운 원문이라
  재계산이 비싸기 때문에, 여기서는 저장이 맞는 판단이다.

---

## 4. API 구조 (Route Handlers)

기존 관행(Server Actions 우선)을 유지한다. Route Handler는 **스트리밍이 필요한 AI 생성**에만
사용한다.

| 엔드포인트                        | 이유                                               |
| --------------------------------- | -------------------------------------------------- |
| `POST /api/ai/problems/generate`  | 여러 문제를 한 번에 생성 — SSE로 진행 상황 표시    |
| `POST /api/ai/mock-exam/generate` | 45문항 생성은 수십 초 걸릴 수 있음 — 스트리밍 필수 |
| `POST /api/ai/analysis/generate`  | 리포트 생성도 길게 걸릴 수 있어 스트리밍 권장      |

즐겨찾기 토글, 답안 제출·채점, 친구 요청, 배틀 초대 등 **나머지 전부는 Server Actions**로
유지한다.

---

## 5. Server Actions 구조

| 파일                            | 주요 함수                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `features/problems/actions.ts`  | `createProblemsFromAi(input)`, `toggleFavorite(id)`, `deleteProblem(id)`                                                                                     |
| `features/mock-exam/actions.ts` | `createMockExam(input)`, `submitExamAnswers(examId, answers)` — 서버에서 `Choice.isCorrect` 대조 후 `ExamResult`+`ExamAnswer`+오답인 것만 `WrongAnswer` 생성 |
| `features/review/actions.ts`    | `retryWrongAnswer(id, answer)`, `requestAiExplanation(id)`, `markResolved(id)`                                                                               |
| `features/ai/actions.ts`        | `generateWeaknessAnalysis(userId)`, `generateWeeklyReport(userId)` — AI 클라이언트 호출 후 `AIAnalysis`에 저장                                               |
| `features/social/actions.ts`    | `sendFriendRequest(email)`, `respondToFriendRequest(id, accept)`, `sendMessage(conversationId, content)`                                                     |
| `features/ranking/queries.ts`   | 조회 전용, mutation 없음                                                                                                                                     |
| `features/battle/actions.ts`    | `createBattle(input)`, `inviteParticipant`, `respondToBattleInvite` — 점수는 mutation이 아니라 읽을 때 기존 `StudySession`/`Todo`/`Goal` 집계로 계산         |

모든 mutation은 기존 패턴대로 `requireCurrentUser()` + `userId` 스코프 필터를 그대로 따른다.

---

## 6. AI 호출 구조

> **2026-08 업데이트**: 아래는 1단계 설계 당시(Anthropic 기준) 스케치였고, 이후 **Google
> Gemini로 교체**했다. `features/ai/client.ts` 한 곳만 고치면 됐다는 게 이 절 마지막 항목의
> 요점이었는데, 실제로 정확히 그랬다 — 이 파일을 부르는 problems/mock-exam/review/ai 쪽
> Server Actions는 한 줄도 바뀌지 않았다.

**SDK**: 공식 `@google/genai` (TypeScript/Node.js SDK).
**모델**: `gemini-3.6-flash` (2026-08 기준 Google 공식 GA/기본 권장 모델 — `gemini-2.5-*`
계열은 2026-10 종료 예정이라 배제).

```
features/ai/
  client.ts     — SDK 클라이언트 싱글톤 + generateStructured() 래퍼
  prompts/*.ts  — 프롬프트 템플릿 함수 (순수 함수, 문자열 반환)
  schema.ts     — AI 출력 형태를 검증하는 zod 스키마
```

**구조화된 출력**은 `responseMimeType: "application/json"` + `responseJsonSchema`(zod v4
내장 `z.toJSONSchema()`로 변환) 조합을 쓴다. Gemini의 `responseSchema` 필드는 OpenAPI 3.0의
제한된 서브셋만 받아 일부 zod 구조에서 변환 버그가 있어, 표준 JSON Schema를 그대로 받는
`responseJsonSchema`를 택했다. 응답은 항상 `schema.parse(JSON.parse(response.text))`로 한 번
더 zod 검증을 거친다 — Gemini의 스키마 강제가 완벽하지 않을 가능성에 대한 방어.

```ts
// features/ai/client.ts (실제 구현, phase 1)
import { GoogleGenAI } from "@google/genai";
import { z, type ZodType } from "zod";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateStructured<T>(params: {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  useThinking?: boolean;
}): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: params.prompt,
    config: {
      systemInstruction: params.system,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(params.schema),
      thinkingConfig: params.useThinking ? { thinkingBudget: -1 } : undefined,
    },
  });
  if (!response.text) throw new Error("AI 응답이 비어 있습니다.");
  return params.schema.parse(JSON.parse(response.text));
}
```

- **문제/모의고사 생성**: `generateStructured`로 문제 배열(JSON) 생성 → `Problem`/`Choice`
  레코드로 저장. 45문항처럼 큰 생성은 Route Handler에서 스트리밍으로 진행 상황을 흘려보내는
  방식을 쓸 수 있다(아직 필요할 만큼 문항 수가 커지지 않아 미도입 — 실제 구현 단계의 판단
  기록 참고).
- **오답 해설/취약 단원 분석**: 추론 비중이 높으므로 `thinkingConfig: { thinkingBudget: -1 }`
  (자동 사고 예산)을 켠다.
- **Server Actions는 SDK를 직접 호출하지 않고 항상 `features/ai/client.ts`를 거친다** —
  나중에 모델/제공자를 바꾸거나 재시도·로깅 정책을 추가할 때 한 파일만 고치면 되게 하기
  위함. Anthropic → Gemini 전환이 실제로 이 파일 하나만 건드리고 끝난 것이 그 증거.
- `.env.example`에 `GEMINI_API_KEY` 추가 필요.

---

## 7. 우선순위 (의존성 + 리스크 기반)

1. **AI 공통 인프라** — 눈에 보이는 기능은 없지만 이후 전부를 막고 있음. 작고 빠름.
2. **features/problems** — 첫 AI 체감 기능. 콘텐츠 엔진의 핵심.
3. **features/review** — Problem만 있으면 바로 추가 가능. 일상 사용 빈도가 높음.
4. **features/mock-exam** — Problem 재사용 + OMR/타이머/채점 UI가 더해져 복잡도가 높으므로
   문제/복습보다 뒤.
5. **AI Tutor 확장(분석/리포트)** — 분석할 오답·시험 데이터가 실제로 쌓인 뒤에야 의미가 있음.
6. **대시보드 카드 통합** — 2~5단계의 쿼리가 이미 있으므로 얇은 통합 레이어.
7. **features/social** — 학습 트랙과 데이터 의존이 없어 독립적으로 진행 가능.
8. **features/ranking** — "친구" 탭이 소셜 그래프에 의존.
9. **features/battle** — 가장 복잡함(다자간 조율 + 점수화), 소셜에 의존 — 마지막.

---

## 8. 권장 커밋 단위

MVP 때처럼 기능 슬라이스 하나당 커밋 하나(또는 작은 연속 커밋).

1. `feat: add AI client + prompt/schema infra (features/ai/client.ts)`
2. `feat: add Problem/ProblemSet/Choice Prisma models`
3. `feat: AI problem generation (features/problems, /problems page)`
4. `feat: problem favorites + manual delete`
5. `feat: WrongAnswer model + review feature (오답노트)`
6. `feat: AI explanation for wrong answers`
7. `feat: MockExam/ExamQuestion/ExamResult/ExamAnswer models`
8. `feat: mock exam generation + OMR + timer (/mock-exam)`
9. `feat: auto-grading + exam result page`
10. `feat: AIAnalysis model + weakness analysis (AI Tutor)`
11. `feat: weekly report generation`
12. `feat: dashboard cards — 오늘 추천 문제/복습/모의고사`
13. `feat: Friendship/Conversation/Message models + social feature`
14. `feat: DM UI`
15. `feat: ranking queries + /ranking page (전체/친구/시즌)`
16. `feat: add User.school + school ranking`
17. `feat: Battle/BattleParticipant models + battle creation/invite`
18. `feat: battle scoring + progress UI (/battle)`

각 커밋은 독립적으로 `typecheck`/`lint`/`build`가 통과해야 하며, MVP 8단계와 동일한 방식으로
진행한다 — 한 번에 몰아서 구현하지 않는다.
