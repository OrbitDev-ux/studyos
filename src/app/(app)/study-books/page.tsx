import { BookMarked, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanStatusChip } from "@/features/billing/components/plan-status-chip";
import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
import { getPlanSummary } from "@/features/billing/usage";
import { CreateStudyBookDialog } from "@/features/study-books/components/create-study-book-dialog";
import {
  StudyBookGrid,
  type StudyBookListItem,
} from "@/features/study-books/components/study-book-list";
import { getStudyBooks, getStudyBookProgress } from "@/features/study-books/queries";
import { requireCurrentUser } from "@/lib/session";

// Book generation runs a long AI call in the create Server Action.
export const maxDuration = 60;

export default async function StudyBooksPage() {
  const user = await requireCurrentUser();
  const [books, planSummary] = await Promise.all([
    getStudyBooks(user.id),
    getPlanSummary(user.id),
  ]);

  const items: StudyBookListItem[] = await Promise.all(
    books.map(async (book) => {
      const progress = await getStudyBookProgress(book.id, user.id);
      return {
        id: book.id,
        title: book.title,
        subjectName: book.subjectName,
        grade: book.grade,
        unit: book.unit,
        type: book.type,
        chapterCount: book._count.chapters,
        learningRatePercent: progress.learningRatePercent,
      };
    }),
  );

  const bookUsage = planSummary.features.studyBookGeneration;
  const atLimit = bookUsage.limit !== null && bookUsage.used >= bookUsage.limit;

  const createTrigger = (
    <Button size="sm" className="gap-1.5">
      <Plus className="size-4" /> 나만의 교재 만들기
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookMarked className="size-5" /> 나만의 교재
          </h1>
          <CreateStudyBookDialog trigger={createTrigger} />
        </div>
        <PlanStatusChip
          summary={planSummary}
          usage={bookUsage}
          usageLabel="교재 생성"
        />
      </div>

      {atLimit && (
        <UpgradeNotice
          title="이번 교재 생성 한도를 모두 사용했어요"
          message="상위 플랜으로 업그레이드하면 더 많은 교재를 만들 수 있어요."
          cta="플랜 비교하기"
        />
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-muted-foreground text-sm">
              아직 만든 교재가 없어요. 학습 목적과 스타일을 입력하면 StudyOS가 개념·예제·문제·해설이
              담긴 나만의 교재를 만들어드려요.
            </p>
            <CreateStudyBookDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> 첫 교재 만들기
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <StudyBookGrid books={items} />
      )}
    </div>
  );
}
