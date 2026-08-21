"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Subject } from "@/generated/prisma/client";
import { buildProblemsHref, type ProblemsParams } from "@/features/problems/search-params";
import { useI18n } from "@/features/i18n/provider";

const ALL_SUBJECTS_VALUE = "__all__";

export function ProblemsSubjectFilter({
  params,
  subjects,
}: {
  params: ProblemsParams;
  subjects: Subject[];
}) {
  const router = useRouter();
  const t = useI18n().messages.problems;

  if (subjects.length === 0) return null;

  return (
    <Select
      value={params.subjectId || ALL_SUBJECTS_VALUE}
      onValueChange={(value) =>
        router.push(
          buildProblemsHref(params, {
            subjectId: value === ALL_SUBJECTS_VALUE ? "" : value,
          }),
        )
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_SUBJECTS_VALUE}>{t.allSubjects}</SelectItem>
        {subjects.map((subject) => (
          <SelectItem key={subject.id} value={subject.id}>
            {subject.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
