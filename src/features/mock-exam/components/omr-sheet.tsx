import { MathText } from "@/components/ui/math-text";
import type { getMockExam } from "@/features/mock-exam/queries";
import { cn } from "@/lib/utils";

export function OmrSheet({
  questions,
  answers,
  onSelect,
}: {
  questions: NonNullable<Awaited<ReturnType<typeof getMockExam>>>["questions"];
  answers: Record<string, string>;
  onSelect: (problemId: string, choiceId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">
            {index + 1}. <MathText>{question.problem.prompt}</MathText>
          </p>
          <div className="flex flex-wrap gap-2">
            {question.problem.choices.map((choice) => {
              const isSelected = answers[question.problem.id] === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onSelect(question.problem.id, choice.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-primary",
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
