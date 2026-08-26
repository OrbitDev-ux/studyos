import { BookMarked, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PlanStatusChip } from "@/features/billing/components/plan-status-chip";
import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";
import { getPlanSummary } from "@/features/billing/usage";
import { CreateStudyBookDialog } from "@/features/study-books/components/create-study-book-dialog";
import {
  StudyBookGrid,
  type StudyBookListItem,
} from "@/features/study-books/components/study-book-list";
import { getStudyBooks, getStudyBookProgress } from "@/features/study-books/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

// Book generation runs a long AI call in the create Server Action.
export const maxDuration = 300;

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
  const t = getMessages(await getServerLocale(user.locale)).studyBooks;

  const createTrigger = (
    <Button size="sm" className="gap-1.5">
      <Plus className="size-4" /> {t.create}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageHeader
          icon={BookMarked}
          title={t.title}
          actions={<CreateStudyBookDialog trigger={createTrigger} />}
        />
        <PlanStatusChip
          summary={planSummary}
          usage={bookUsage}
          usageLabel={t.usageLabel}
        />
      </div>

      {atLimit && (
        <UpgradeNotice title={t.limitTitle} message={t.limitMessage} cta={t.limitCta} />
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-muted-foreground text-sm">{t.emptyDesc}</p>
            <CreateStudyBookDialog
              trigger={
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-4" /> {t.createFirst}
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
