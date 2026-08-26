import { LinkTabs } from "@/components/layout/link-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { ProblemList } from "@/features/problems/components/problem-list";
import { getProblems } from "@/features/problems/queries";
import { parseProblemsParams } from "@/features/problems/search-params";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

// Server Actions inherit the invoking route's maxDuration. generateProblems()
// calibrates its own AI-call timeout/retry budget to this value (see
// generationBudgetFor in features/problems/actions.ts) — keep them in sync if
// this changes.
export const maxDuration = 60;

const PROBLEMS_TABS = [
  { href: "/problems", labelKey: "problems" },
  { href: "/study-bank", labelKey: "studyBank" },
] as const;

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = parseProblemsParams(await searchParams);
  const [result, subjects] = await Promise.all([
    getProblems(user.id, params),
    getSubjects(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).problems;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader title={t.title} />
        <LinkTabs items={PROBLEMS_TABS} />
      </div>
      <ProblemList result={result} params={params} subjects={subjects} t={t} />
    </div>
  );
}
