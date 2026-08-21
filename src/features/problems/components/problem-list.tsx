import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationNav } from "@/features/admin/components/pagination-nav";
import { ProblemCard } from "@/features/problems/components/problem-card";
import { ProblemGeneratorForm } from "@/features/problems/components/problem-generator-form";
import { ProblemsSubjectFilter } from "@/features/problems/components/problems-subject-filter";
import { ProblemsTabsNav } from "@/features/problems/components/problems-tabs-nav";
import type { PaginatedProblems } from "@/features/problems/queries";
import { buildProblemsHref, type ProblemsParams } from "@/features/problems/search-params";
import type { Subject } from "@/generated/prisma/client";
import type { Messages } from "@/features/i18n/messages";

export function ProblemList({
  result,
  params,
  subjects,
  t,
}: {
  result: PaginatedProblems;
  params: ProblemsParams;
  subjects: Subject[];
  t: Messages["problems"];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <ProblemsTabsNav params={params} />
          <ProblemsSubjectFilter params={params} subjects={subjects} />
        </div>
        <ProblemGeneratorForm
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Sparkles className="size-4" />
              {t.generate}
            </Button>
          }
        />
      </div>
      {result.items.length === 0 ? (
        <div className="bg-muted/20 flex flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-12 text-center">
          <Sparkles className="text-muted-foreground size-5" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {result.items.map((problem, i) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                progress={{ index: i + 1, total: result.items.length }}
                nextProblemId={result.items[i + 1]?.id ?? null}
              />
            ))}
          </div>
          <PaginationNav
            page={result.page}
            totalPages={result.totalPages}
            hrefForPage={(page) => buildProblemsHref(params, { page })}
          />
        </>
      )}
    </div>
  );
}
