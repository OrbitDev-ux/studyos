import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkTabs } from "@/components/layout/link-tabs";
import { PaginationNav } from "@/features/admin/components/pagination-nav";
import { ProblemGeneratorForm } from "@/features/problems/components/problem-generator-form";
import { StudyBankCard } from "@/features/study-bank/components/study-bank-card";
import { StudyBankFilters } from "@/features/study-bank/components/study-bank-filters";
import { StudyBankMobileFilters } from "@/features/study-bank/components/study-bank-mobile-filters";
import { StudyBankRecommendedBanner } from "@/features/study-bank/components/study-bank-recommended-banner";
import { StudyBankSearch } from "@/features/study-bank/components/study-bank-search";
import { StudyBankSort } from "@/features/study-bank/components/study-bank-sort";
import { StudyBankTabsNav } from "@/features/study-bank/components/study-bank-tabs";
import { getStudyBankFacets, getStudyBankProblems } from "@/features/study-bank/queries";
import {
  buildStudyBankHref,
  hasActiveFilters,
  parseStudyBankParams,
} from "@/features/study-bank/search-params";
import { getMessages, type Messages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

// The AI generation modal (ProblemGeneratorForm) is hosted here; its Server
// Action regularly runs past the default serverless timeout.
export const maxDuration = 60;

const STUDY_BANK_TABS = [
  { href: "/problems", labelKey: "problems" },
  { href: "/study-bank", labelKey: "studyBank" },
] as const;

export default async function StudyBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const params = parseStudyBankParams(await searchParams);

  const [facets, result] = await Promise.all([
    getStudyBankFacets(user.id),
    getStudyBankProblems(user.id, params),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).studyBank;

  return (
    <div className="flex flex-col gap-6">
      <LinkTabs items={STUDY_BANK_TABS} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">📚 {t.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.subtitle}</p>
        </div>
        <ProblemGeneratorForm
          trigger={
            <Button type="button" className="gap-1.5">
              <Sparkles className="size-4" /> {t.generate}
            </Button>
          }
        />
      </div>

      <StudyBankSearch params={params} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <StudyBankTabsNav params={params} />
        <div className="flex items-center gap-2">
          <StudyBankMobileFilters params={params} facets={facets} />
          <StudyBankSort params={params} />
        </div>
      </div>

      {params.tab === "recommended" && <StudyBankRecommendedBanner />}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-4">
            <StudyBankFilters params={params} facets={facets} />
          </div>
        </aside>

        {/* Main list */}
        <div className="flex min-w-0 flex-col gap-4">
          <p className="text-muted-foreground text-xs">
            {t.total.replace("{count}", String(result.total))}
          </p>

          {result.items.length === 0 ? (
            <EmptyState resettable={hasActiveFilters(params)} t={t} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.items.map((problem) => (
                  <StudyBankCard
                    key={problem.id}
                    problem={problem}
                    owned={problem.userId === user.id}
                  />
                ))}
              </div>
              <PaginationNav
                page={result.page}
                totalPages={result.totalPages}
                hrefForPage={(page) => buildStudyBankHref(params, { page })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  resettable,
  t,
}: {
  resettable: boolean;
  t: Messages["studyBank"];
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-2xl">📚</p>
      <div>
        <p className="text-sm font-medium">{t.emptyTitle}</p>
        <p className="text-muted-foreground text-sm">{t.emptyDesc}</p>
      </div>
      {resettable && (
        <Button asChild variant="outline" size="sm">
          <a href="/study-bank">{t.resetFilter}</a>
        </Button>
      )}
    </div>
  );
}
