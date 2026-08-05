import { notFound } from "next/navigation";
import { ExamResultCard } from "@/features/mock-exam/components/exam-result-card";
import { getExamResult } from "@/features/mock-exam/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function ExamResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ resultId?: string }>;
}) {
  const { examId } = await params;
  const { resultId } = await searchParams;
  const user = await requireCurrentUser();
  const result = await getExamResult(examId, user.id, resultId);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">모의고사 결과</h1>
      <ExamResultCard result={result} />
    </div>
  );
}
