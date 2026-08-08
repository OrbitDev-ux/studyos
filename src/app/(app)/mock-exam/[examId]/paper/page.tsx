import { notFound } from "next/navigation";
import { ExamPaperDocument, type ExamPaperData } from "@/features/exam-paper/components/exam-paper-document";
import { ExamPaperToolbar } from "@/features/exam-paper/components/exam-paper-toolbar";
import { getMockExam } from "@/features/mock-exam/queries";
import { requireCurrentUser } from "@/lib/session";

/**
 * Printable exam-paper view for a mock exam. Owner-scoped (getMockExam filters
 * by userId). Reuses the existing exam data untouched — only the presentation is
 * the A4 document. Answers/explanations are intentionally not rendered.
 */
export default async function ExamPaperPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const user = await requireCurrentUser();
  const exam = await getMockExam(examId, user.id);
  if (!exam) notFound();

  const data: ExamPaperData = {
    subjectName: exam.subject?.name ?? "과목",
    title: exam.title,
    questionCount: exam.questions.length,
    timeLimitMinutes: Math.round(exam.timeLimitSec / 60),
    questions: exam.questions.map((q) => ({
      id: q.problem.id,
      prompt: q.problem.prompt,
      difficulty: q.problem.difficulty,
      choices: q.problem.choices.map((c) => c.content),
    })),
  };

  return (
    <>
      <ExamPaperToolbar backHref="/mock-exam" />
      <ExamPaperDocument data={data} />
    </>
  );
}
