import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { requireCurrentUser } from "@/lib/session";

// The AI generation modal (ProblemGeneratorForm) is hosted here; its Server
// Action regularly runs past the default serverless timeout.
export const maxDuration = 60;

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">📚 문제은행</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            StudyOS의 다양한 문제를 탐색하고 풀어보세요.
          </p>
        </div>
        <ProblemGeneratorForm
          trigger={
            <Button type="button" className="gap-1.5">
              <Sparkles className="size-4" /> AI 문제 생성
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
            총 {result.total}개의 문제
          </p>

          {result.items.length === 0 ? (
            <EmptyState resettable={hasActiveFilters(params)} />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.items.map((problem) => (
                  <StudyBankCard key={problem.id} problem={problem} />
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

function EmptyState({ resettable }: { resettable: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-2xl">📚</p>
      <div>
        <p className="text-sm font-medium">문제가 없습니다.</p>
        <p className="text-muted-foreground text-sm">
          검색 조건이나 필터를 변경해보세요.
        </p>
      </div>
      {resettable && (
        <Button asChild variant="outline" size="sm">
          <a href="/study-bank">필터 초기화</a>
        </Button>
      )}
    </div>
  );
}
