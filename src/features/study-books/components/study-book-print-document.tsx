import { MathText } from "@/components/ui/math-text";
import { siteConfig } from "@/config/site";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import type { getStudyBook } from "@/features/study-books/queries";
import {
  showAnswers,
  showExplanations,
  type IncludeLevel,
} from "@/features/study-books/print/options";
import { studyBookTypeLabel } from "@/features/study-books/types";

type Book = NonNullable<Awaited<ReturnType<typeof getStudyBook>>>;
type Chapter = Book["chapters"][number];
type Item = Chapter["items"][number];

const KIND_LABEL: Record<string, string> = {
  concept: "개념",
  example: "예제",
  practice: "연습 문제",
  application: "응용 문제",
  advanced: "심화 문제",
  review: "복습",
};

/**
 * A4 printable / PDF document for a study book. Pure presentation — reuses the
 * existing book data and the shared <MathText> renderer so every equation prints
 * as real math (분수·지수 등), identical to the on-screen viewer. Printing is the
 * browser's native "인쇄 / PDF 저장" (window.print), the same zero-dependency path
 * the exam paper uses; no PDF library is added.
 *
 * `chapters` is either the whole book or a single chapter (현재 챕터 저장).
 */
export function StudyBookPrintDocument({
  book,
  chapters,
  include,
  correctAnswers,
}: {
  book: Book;
  chapters: Chapter[];
  include: IncludeLevel;
  /** MULTIPLE_CHOICE answer-key text by problemId — see getMultipleChoiceAnswerText's
   * doc comment for why this is fetched separately from `book`. */
  correctAnswers: Map<string, string>;
}) {
  const brand = siteConfig.name;
  const totalProblems = chapters.reduce(
    (n, c) => n + c.items.filter((it) => it.problem).length,
    0,
  );
  const scoped = chapters.length !== book.chapters.length;
  const runningFooterLabel = `${book.subjectName} · ${book.title}`;

  return (
    <div className="book-doc-bg">
      <article className="book-paper">
        {/* 1. 표지 (cover) */}
        <section className="book-cover">
          <div className="book-cover-brand">{brand} · 나만의 교재</div>
          <h1 className="book-cover-title">{book.title}</h1>
          <p className="book-cover-sub">
            {book.subjectName} · {book.grade}
            {book.unit ? ` · ${book.unit}` : ""}
          </p>
          <div className="book-cover-tags">
            <span className="book-tag">{studyBookTypeLabel(book.type)}</span>
            <span className="book-tag">{DIFFICULTY_LABEL[book.difficulty]}</span>
            {scoped && <span className="book-tag">현재 챕터</span>}
          </div>
        </section>

        {/* 2. 교재 정보 (info) */}
        <section className="book-info">
          <div className="book-info-box">
            <div className="book-info-label">과목</div>
            <div className="book-info-value">{book.subjectName}</div>
          </div>
          <div className="book-info-box">
            <div className="book-info-label">학년</div>
            <div className="book-info-value">{book.grade}</div>
          </div>
          <div className="book-info-box">
            <div className="book-info-label">챕터</div>
            <div className="book-info-value">{chapters.length}</div>
          </div>
          <div className="book-info-box">
            <div className="book-info-label">문항</div>
            <div className="book-info-value">{totalProblems}</div>
          </div>
        </section>

        {/* 3. 목차 (table of contents) */}
        <section className="book-toc">
          <h2 className="book-section-title">목차</h2>
          <ol className="book-toc-list">
            {chapters.map((c, i) => (
              <li className="book-toc-row" key={c.id}>
                <span className="book-toc-no">{i + 1}</span>
                <span className="book-toc-title">{c.title}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. 챕터 */}
        {chapters.map((chapter, ci) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            number={ci + 1}
            include={include}
            correctAnswers={correctAnswers}
          />
        ))}

        {/* Footer (screen) */}
        <footer className="book-screen-footer">
          <span>{brand.toLowerCase()}</span>
          <span>{runningFooterLabel}</span>
        </footer>

        {/* Running footer (repeats on every printed page) */}
        <div className="book-running-footer" aria-hidden>
          <span>{brand.toLowerCase()}</span>
          <span>{runningFooterLabel}</span>
        </div>
      </article>
    </div>
  );
}

function ChapterSection({
  chapter,
  number,
  include,
  correctAnswers,
}: {
  chapter: Chapter;
  number: number;
  include: IncludeLevel;
  correctAnswers: Map<string, string>;
}) {
  let problemNo = 0;
  return (
    <section className="book-chapter">
      <h2 className="book-chapter-title">
        {number}. {chapter.title}
      </h2>

      {/* 5. 개념 */}
      {chapter.concept && (
        <div className="book-concept">
          <div className="book-block-label">개념</div>
          <MathText className="book-prose">{chapter.concept}</MathText>
        </div>
      )}

      {/* 6·7. 예제 / 문제 (items in order) */}
      {chapter.items.map((item) => {
        if (item.problem) {
          problemNo += 1;
          return (
            <ProblemBlock
              key={item.id}
              item={item}
              number={problemNo}
              include={include}
              correctAnswers={correctAnswers}
            />
          );
        }
        if (item.content) {
          return (
            <div className="book-prose-item" key={item.id}>
              <div className="book-block-label">{KIND_LABEL[item.kind] ?? "본문"}</div>
              <MathText className="book-prose">{item.content}</MathText>
            </div>
          );
        }
        return null;
      })}

      {/* 10. 복습 포인트 */}
      {chapter.reviewPoints && (
        <div className="book-review">
          <div className="book-block-label">복습 포인트</div>
          <MathText className="book-prose">{chapter.reviewPoints}</MathText>
        </div>
      )}
    </section>
  );
}

function ProblemBlock({
  item,
  number,
  include,
  correctAnswers,
}: {
  item: Item;
  number: number;
  include: IncludeLevel;
  correctAnswers: Map<string, string>;
}) {
  const problem = item.problem!;
  const isMc = problem.type === "MULTIPLE_CHOICE";
  const correctAnswerText = correctAnswers.get(problem.id) ?? null;

  return (
    <div className="book-problem">
      <p className="book-problem-prompt">
        <span className="book-problem-no">{number}.</span>{" "}
        <MathText>{problem.prompt}</MathText>
      </p>

      {isMc && problem.choices.length > 0 && (
        <ul className="book-choices">
          {problem.choices.map((choice) => (
            <li className="book-choice" key={choice.id}>
              <span className="book-choice-mark">{choice.label}.</span>
              <MathText>{choice.content}</MathText>
            </li>
          ))}
        </ul>
      )}

      {/* 8. 정답 */}
      {showAnswers(include) && (
        <div className="book-answer">
          <span className="book-block-label">정답</span>{" "}
          {isMc ? (
            correctAnswerText ? (
              <MathText>{correctAnswerText}</MathText>
            ) : (
              <span>—</span>
            )
          ) : problem.answerText ? (
            <MathText>{problem.answerText}</MathText>
          ) : (
            <span>—</span>
          )}
        </div>
      )}

      {/* 9. 해설 */}
      {showExplanations(include) && (problem.explanation || problem.scoringCriteria) && (
        <div className="book-explanation">
          <span className="book-block-label">해설</span>
          {problem.explanation && <MathText className="book-prose">{problem.explanation}</MathText>}
          {problem.scoringCriteria && (
            <MathText className="book-prose book-criteria">
              {`핵심 채점 요소: ${problem.scoringCriteria}`}
            </MathText>
          )}
        </div>
      )}
    </div>
  );
}
