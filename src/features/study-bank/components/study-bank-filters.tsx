"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/features/problems/constants";
import type { StudyBankFacets } from "@/features/study-bank/queries";
import {
  buildStudyBankHref,
  hasActiveFilters,
  type StudyBankParams,
} from "@/features/study-bank/search-params";
import type { Difficulty, QuestionType } from "@/generated/prisma/client";

const ALL = "__all__";
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const TYPES: QuestionType[] = ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"];

export function StudyBankFilters({
  params,
  facets,
  onNavigate,
}: {
  params: StudyBankParams;
  facets: StudyBankFacets;
  /** Called after a navigation (e.g. to close the mobile drawer). */
  onNavigate?: () => void;
}) {
  const router = useRouter();

  function go(overrides: Partial<StudyBankParams>) {
    router.push(buildStudyBankHref(params, overrides));
    onNavigate?.();
  }

  const units = params.subject
    ? (facets.unitsBySubject[params.subject] ?? [])
    : facets.allUnits;

  return (
    <div className="flex flex-col gap-4">
      <Field label="과목">
        <Select
          value={params.subject || ALL}
          onValueChange={(v) => go({ subject: v === ALL ? "" : v, unit: "" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {facets.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="단원">
        <Select
          value={params.unit || ALL}
          onValueChange={(v) => go({ unit: v === ALL ? "" : v })}
          disabled={units.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {units.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="난이도">
        <Select
          value={params.difficulty || ALL}
          onValueChange={(v) => go({ difficulty: v === ALL ? "" : (v as Difficulty) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="문제 유형">
        <Select
          value={params.type || ALL}
          onValueChange={(v) => go({ type: v === ALL ? "" : (v as QuestionType) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {QUESTION_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-start gap-1.5"
        disabled={!hasActiveFilters(params)}
        onClick={() =>
          go({ q: "", subject: "", unit: "", difficulty: "", type: "" })
        }
      >
        <RotateCcw className="size-4" /> 필터 초기화
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
