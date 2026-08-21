"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildProblemsHref,
  PROBLEMS_TABS,
  type ProblemsParams,
  type ProblemsTab,
} from "@/features/problems/search-params";
import { useI18n } from "@/features/i18n/provider";

/** Server-driven (URL-param) all/favorites tabs — was client-only `useState`
 * filtering over a fully-loaded list, which no longer works now that
 * pagination means the client only ever has one page's worth of problems. */
export function ProblemsTabsNav({ params }: { params: ProblemsParams }) {
  const router = useRouter();
  const t = useI18n().messages.problems;
  const label: Record<ProblemsTab, string> = { all: t.all, favorites: t.favorites };

  return (
    <Tabs
      value={params.tab}
      onValueChange={(v) => router.push(buildProblemsHref(params, { tab: v as ProblemsTab }))}
    >
      <TabsList>
        {PROBLEMS_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {label[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
