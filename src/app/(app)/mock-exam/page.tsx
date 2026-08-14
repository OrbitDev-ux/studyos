import { Button } from "@/components/ui/button";
import { ExamSetupForm } from "@/features/mock-exam/components/exam-setup-form";
import { MockExamCard } from "@/features/mock-exam/components/mock-exam-card";
import { getMockExams } from "@/features/mock-exam/queries";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

// generateMockExam's AI call regularly runs past Vercel's default
// serverless timeout — Server Actions inherit the invoking route's
// maxDuration, so it has to be set here rather than in the action file.
export const maxDuration = 300;

export default async function MockExamPage() {
  const user = await requireCurrentUser();

  const [exams, subjects] = await Promise.all([
    getMockExams(user.id),
    getSubjects(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).mockExam;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <ExamSetupForm
          subjects={subjects}
          trigger={
            <Button type="button" size="sm" disabled={subjects.length === 0}>
              {t.generate}
            </Button>
          }
        />
      </div>
      {subjects.length === 0 && (
        <p className="text-muted-foreground text-sm">{t.needSubject}</p>
      )}
      {exams.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exams.map((exam) => (
            <MockExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}
