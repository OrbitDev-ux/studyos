import { Button } from "@/components/ui/button";
import { ExamSetupForm } from "@/features/mock-exam/components/exam-setup-form";
import { MockExamCard } from "@/features/mock-exam/components/mock-exam-card";
import { getMockExams } from "@/features/mock-exam/queries";
import { getSubjects } from "@/features/subjects/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function MockExamPage() {
  const user = await requireCurrentUser();

  const [exams, subjects] = await Promise.all([
    getMockExams(user.id),
    getSubjects(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">모의고사</h1>
        <ExamSetupForm
          subjects={subjects}
          trigger={
            <Button type="button" size="sm" disabled={subjects.length === 0}>
              모의고사 생성
            </Button>
          }
        />
      </div>
      {subjects.length === 0 && (
        <p className="text-muted-foreground text-sm">
          모의고사를 만들려면 먼저 과목을 추가해주세요.
        </p>
      )}
      {exams.length === 0 ? (
        <p className="text-muted-foreground text-sm">아직 생성한 모의고사가 없습니다.</p>
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
