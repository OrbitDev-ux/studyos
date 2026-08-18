import { LinkTabs } from "@/components/layout/link-tabs";
import { ProblemList } from "@/features/problems/components/problem-list";
import { getProblems } from "@/features/problems/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

// generateProblems' AI call regularly runs past Vercel's default serverless
// timeout — Server Actions inherit the invoking route's maxDuration.
export const maxDuration = 60;

const PROBLEMS_TABS = [
  { href: "/problems", labelKey: "problems" },
  { href: "/study-bank", labelKey: "studyBank" },
] as const;

export default async function ProblemsPage() {
  const user = await requireCurrentUser();
  const problems = await getProblems(user.id);
  const t = getMessages(await getServerLocale(user.locale)).problems;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h1>
        <LinkTabs items={PROBLEMS_TABS} />
      </div>
      <ProblemList problems={problems} />
    </div>
  );
}
