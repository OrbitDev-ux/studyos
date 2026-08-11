"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildStudyBankHref,
  SORT_LABEL,
  STUDY_BANK_SORTS,
  type StudyBankParams,
  type StudyBankSort,
} from "@/features/study-bank/search-params";

export function StudyBankSort({ params }: { params: StudyBankParams }) {
  const router = useRouter();
  return (
    <Select
      value={params.sort}
      onValueChange={(v) =>
        router.push(buildStudyBankHref(params, { sort: v as StudyBankSort }))
      }
    >
      <SelectTrigger className="w-36" aria-label="정렬">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STUDY_BANK_SORTS.map((s) => (
          <SelectItem key={s} value={s}>
            {SORT_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
