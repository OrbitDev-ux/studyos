import { notFound } from "next/navigation";
import { TakeExamView } from "@/features/mock-exam/components/take-exam-view";
import { getMockExam } from "@/features/mock-exam/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const user = await requireCurrentUser();
  const exam = await getMockExam(examId, user.id);
  if (!exam) notFound();

  return <TakeExamView exam={exam} />;
}
