import { circledNumber, padQuestionNumber } from "@/features/exam-paper/format";

/**
 * Blank OMR answer sheet in the same design language as the paper. Starts on a
 * new printed page. `bubblesPerQuestion` defaults to 5 (오지선다). Rendered blank
 * — this is a sheet the student fills in by hand.
 */
export function ExamAnswerSheet({
  questionCount,
  bubblesPerQuestion = 5,
}: {
  questionCount: number;
  bubblesPerQuestion?: number;
}) {
  const bubbles = Array.from({ length: bubblesPerQuestion }, (_, i) => circledNumber(i));

  return (
    <section className="exam-answersheet" aria-label="답안지">
      <h2 className="exam-title" style={{ fontSize: 20 }}>
        답안지
      </h2>
      <p className="exam-meta" style={{ marginTop: 4 }}>
        정답에 해당하는 번호를 표기하세요.
      </p>
      <ol
        className="exam-answersheet-grid"
        style={{ listStyle: "none", margin: "12px 0 0", padding: 0 }}
      >
        {Array.from({ length: questionCount }, (_, i) => (
          <li className="exam-answersheet-row" key={i}>
            <span className="exam-answersheet-no">{padQuestionNumber(i + 1)}</span>
            <span className="exam-answersheet-bubbles">
              {bubbles.map((b, bi) => (
                <span key={bi} aria-hidden>
                  {b}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
