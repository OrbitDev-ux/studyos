import { WrongAnswerList } from "@/features/review/components/wrong-answer-list";
import { getWrongAnswers } from "@/features/review/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function ReviewPage() {
  const user = await requireCurrentUser();
  const wrongAnswers = await getWrongAnswers(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">오답노트</h1>
      <WrongAnswerList wrongAnswers={wrongAnswers} />
    </div>
  );
}
