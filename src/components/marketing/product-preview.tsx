import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SubjectChip } from "@/features/subjects/components/subject-chip";
import { cn } from "@/lib/utils";

/**
 * Static mockup of the /problems screen for the landing page hero — not a
 * live demo. Built from the same Card/Badge primitives and choice-button
 * styling as features/problems/components/{problem-card,solve-problem-panel}
 * so it stays visually honest to the real product, but every element here
 * is non-interactive (no Server Actions, no real problem id).
 */
const MOCK_CHOICES = [
  { label: "①", content: "-1", isCorrect: true },
  { label: "②", content: "0", isCorrect: false },
  { label: "③", content: "1", isCorrect: false },
  { label: "④", content: "3", isCorrect: false },
];

export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-xl border shadow-2xl shadow-black/10">
        {/* browser chrome */}
        <div className="bg-muted flex items-center gap-2 border-b px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-yellow-400" />
            <span className="size-2.5 rounded-full bg-green-400" />
          </div>
          <div className="bg-background text-muted-foreground mx-auto flex w-fit items-center rounded-md px-3 py-0.5 text-xs">
            studyos.app/problems
          </div>
        </div>

        {/* mock screen content */}
        <div className="bg-card p-5 sm:p-6">
          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <SubjectChip name="수학" color="#6366f1" />
                <Badge variant="outline">보통</Badge>
                <span className="text-muted-foreground text-xs">이차함수</span>
              </div>

              <p className="text-sm font-medium">
                이차함수 y = x² − 4x + 3의 최솟값을 구하세요.
              </p>

              <div className="flex flex-col gap-1.5">
                {MOCK_CHOICES.map((choice) => (
                  <div
                    key={choice.label}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                      choice.isCorrect
                        ? "border-success bg-success/10 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    <span>
                      {choice.label} {choice.content}
                    </span>
                    {choice.isCorrect && <Check className="text-success size-4" />}
                  </div>
                ))}
              </div>

              <p className="text-success flex items-center gap-1.5 text-sm font-medium">
                <Check className="size-4" />
                정답입니다! x = 2에서 최솟값 -1을 가져요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* fade into page background */}
      <div className="from-background pointer-events-none absolute inset-x-0 -bottom-1 h-24 bg-gradient-to-t to-transparent" />
    </div>
  );
}
