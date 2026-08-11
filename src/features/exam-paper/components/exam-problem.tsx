import { MathText } from "@/components/ui/math-text";
import { circledNumber } from "@/features/exam-paper/format";
import { cn } from "@/lib/utils";

/**
 * One printed problem: number + prompt (right-aligned 배점), then vertical
 * circled-number choices. Renders a BLANK exam item — no correct-answer marking
 * and no explanation (that's the graded review, a different surface).
 */
export function ExamProblem({
  number,
  prompt,
  choices,
  points,
  fullWidth = false,
}: {
  number: number;
  prompt: string;
  choices: string[];
  points: number;
  fullWidth?: boolean;
}) {
  return (
    <li className={cn("exam-problem", fullWidth && "exam-problem--full")}>
      <div className="exam-problem-head">
        <p className="exam-problem-prompt" style={{ whiteSpace: "pre-line" }}>
          <span className="exam-problem-no">{number}.</span> <MathText>{prompt}</MathText>
        </p>
        <span className="exam-points" aria-label={`배점 ${points}점`}>
          [{points}점]
        </span>
      </div>
      <ul className="exam-choices" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {choices.map((choice, index) => (
          <li className="exam-choice" key={index}>
            <span className="exam-choice-mark" aria-hidden>
              {circledNumber(index)}
            </span>
            <span>
              <span className="sr-only">{index + 1}번 </span>
              <MathText>{choice}</MathText>
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}
