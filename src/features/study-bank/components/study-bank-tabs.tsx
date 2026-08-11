"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildStudyBankHref,
  STUDY_BANK_TABS,
  TAB_LABEL,
  type StudyBankParams,
  type StudyBankTab,
} from "@/features/study-bank/search-params";

/** 전체 / 추천 / 오답 / 저장 — reuse existing data (isFavorite, WrongAnswer). */
export function StudyBankTabsNav({ params }: { params: StudyBankParams }) {
  const router = useRouter();
  return (
    <Tabs
      value={params.tab}
      onValueChange={(v) =>
        router.push(buildStudyBankHref(params, { tab: v as StudyBankTab, page: 1 }))
      }
    >
      <TabsList>
        {STUDY_BANK_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {TAB_LABEL[tab]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
