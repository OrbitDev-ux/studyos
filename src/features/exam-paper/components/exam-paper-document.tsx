import type { Difficulty } from "@/generated/prisma/client";
import { isLongPrompt, pointsForDifficulty } from "@/features/exam-paper/format";
import { ExamAnswerSheet } from "@/features/exam-paper/components/exam-answer-sheet";
import { ExamProblem } from "@/features/exam-paper/components/exam-problem";
import { siteConfig } from "@/config/site";

export type ExamPaperQuestion = {
  id: string;
  prompt: string;
  difficulty: Difficulty;
  /** Ordered choice contents; rendered ①②③… by position. */
  choices: string[];
};

export type ExamPaperData = {
  subjectName: string;
  title: string;
  questionCount: number;
  timeLimitMinutes: number;
  questions: ExamPaperQuestion[];
};

/**
 * The printable A4 exam paper. Pure presentation from `data` — reusable for any
 * exam source (real MockExam or demo). Never renders answers/explanations; it's
 * a blank exam plus a blank answer sheet.
 */
export function ExamPaperDocument({ data }: { data: ExamPaperData }) {
  const brand = siteConfig.name;
  const brandLower = brand.toLowerCase();
  const mark = brand.slice(0, 1).toUpperCase();
  const runningFooterLabel = `${data.subjectName} · 문제`;

  return (
    <div className="exam-doc-bg">
      <article className="exam-paper">
        {/* Header */}
        <header className="exam-header">
          <div className="exam-brand">
            <span className="exam-brand-mark" aria-hidden>
              {mark}
            </span>
            {brand}
          </div>
          <span className="exam-kicker">AI Practice Test</span>
        </header>
        <hr className="exam-rule" />

        {/* Title */}
        <div className="exam-title-section">
          <div>
            <p className="exam-meta">{data.subjectName} · PRACTICE EXAM</p>
            <h1 className="exam-title">{data.title}</h1>
          </div>
          <div className="exam-infoboxes">
            <div className="exam-infobox">
              <div className="exam-infobox-label">문항</div>
              <div className="exam-infobox-value">{data.questionCount}</div>
            </div>
            <div className="exam-infobox">
              <div className="exam-infobox-label">시간</div>
              <div className="exam-infobox-value">{data.timeLimitMinutes}분</div>
            </div>
          </div>
        </div>

        {/* Student fields */}
        <div className="exam-student">
          <span className="exam-field">
            <span className="exam-field-label">학년/반</span>
            <span className="exam-field-line exam-field-line--wide" />
          </span>
          <span className="exam-field">
            <span className="exam-field-label">번호</span>
            <span className="exam-field-line" />
          </span>
          <span className="exam-field">
            <span className="exam-field-label">이름</span>
            <span className="exam-field-line exam-field-line--wide" />
          </span>
        </div>

        {/* Notice */}
        <p className="exam-notice">
          본 자료는 AI로 생성된 학습용 모의고사입니다.
          <br />
          학교 평가에 사용하기 전 문항과 정답을 확인해 주세요.
        </p>
        <hr className="exam-rule exam-rule-soft" />

        {/* Problems */}
        <ol
          className="exam-problems"
          style={{ listStyle: "none", margin: "8mm 0 0", padding: 0 }}
        >
          {data.questions.map((q, i) => (
            <ExamProblem
              key={q.id}
              number={i + 1}
              prompt={q.prompt}
              choices={q.choices}
              points={pointsForDifficulty(q.difficulty)}
              fullWidth={isLongPrompt(q.prompt)}
            />
          ))}
        </ol>

        {/* Answer sheet (new page) */}
        <ExamAnswerSheet questionCount={data.questionCount} />

        {/* Footer (screen) */}
        <footer className="exam-screen-footer">
          <span>{brandLower}</span>
          <span>{runningFooterLabel}</span>
          <span>문서</span>
        </footer>

        {/* Footer (repeats every printed page) */}
        <div className="exam-running-footer" aria-hidden>
          <span>{brandLower}</span>
          <span>{runningFooterLabel}</span>
          <span />
        </div>
      </article>
    </div>
  );
}
