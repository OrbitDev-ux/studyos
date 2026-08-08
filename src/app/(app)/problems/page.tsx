import { ProblemList } from "@/features/problems/components/problem-list";
import { getProblems } from "@/features/problems/queries";
import { requireCurrentUser } from "@/lib/session";

// generateProblems' AI call regularly runs past Vercel's default serverless
// timeout — Server Actions inherit the invoking route's maxDuration.
export const maxDuration = 60;

export default async function ProblemsPage() {
  const user = await requireCurrentUser();
  const problems = await getProblems(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">문제</h1>
      <ProblemList problems={problems} />
    </div>
  );
}
