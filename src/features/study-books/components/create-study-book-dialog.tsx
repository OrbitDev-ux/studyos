"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import {
  listGrades,
  listSubjects,
  listUnits,
} from "@/features/curriculum/taxonomy";
import { STUDY_BOOK_TYPES } from "@/features/study-books/types";
import { createStudyBook } from "@/features/study-books/actions";
import { UpgradeNotice } from "@/features/billing/components/upgrade-notice";

const GRADES = listGrades();
const FIRST_GRADE = GRADES[0]?.id ?? "";

type Feedback = { error?: string; code?: string; limit?: number; used?: number; upgradePlan?: string | null };

export function CreateStudyBookDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [title, setTitle] = useState("");
  const [gradeId, setGradeId] = useState(FIRST_GRADE);
  const [subjectId, setSubjectId] = useState(listSubjects(FIRST_GRADE)[0]?.id ?? "");
  const [unitId, setUnitId] = useState(
    listUnits(FIRST_GRADE, listSubjects(FIRST_GRADE)[0]?.id ?? "")[0]?.id ?? "",
  );
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [type, setType] = useState<string>(STUDY_BOOK_TYPES[0].id);
  const [chapterCount, setChapterCount] = useState(3);
  const [problemsPerChapter, setProblemsPerChapter] = useState(3);
  const [customInstructions, setCustomInstructions] = useState("");

  const subjectOptions = listSubjects(gradeId);
  const unitOptions = listUnits(gradeId, subjectId);

  function onGradeChange(next: string) {
    setGradeId(next);
    const s = listSubjects(next)[0]?.id ?? "";
    setSubjectId(s);
    setUnitId(listUnits(next, s)[0]?.id ?? "");
  }
  function onSubjectChange(next: string) {
    setSubjectId(next);
    setUnitId(listUnits(gradeId, next)[0]?.id ?? "");
  }

  async function handleSubmit() {
    setFeedback(null);
    if (!title.trim()) {
      setFeedback({ error: "제목을 입력해주세요." });
      return;
    }
    setPending(true);
    try {
      const result = await createStudyBook({
        title,
        gradeId,
        subjectId,
        unitId,
        difficulty,
        type: type as (typeof STUDY_BOOK_TYPES)[number]["id"],
        chapterCount,
        problemsPerChapter,
        customInstructions: customInstructions.trim() || undefined,
      });
      if (result?.error) {
        setFeedback(result as Feedback);
        return;
      }
      setOpen(false);
      if (result.bookId) router.push(`/study-books/${result.bookId}`);
    } catch {
      setFeedback({ error: "교재 생성에 실패했습니다. 설정은 유지됩니다. 다시 시도해주세요." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return; // don't close mid-generation
        setOpen(next);
        if (!next) setFeedback(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>나만의 교재 만들기</DialogTitle>
        </DialogHeader>

        {pending ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="text-primary size-8 animate-spin" />
            <p className="text-sm font-medium">교재 생성 중...</p>
            <p className="text-muted-foreground text-xs">
              개념·예제·문제·해설을 구성하고 있어요. 30초 정도 걸릴 수 있어요.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="제목">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 나의 수학 개념 + 문제집"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="학년">
                <SelectBox value={gradeId} onChange={onGradeChange} options={GRADES} />
              </Field>
              <Field label="과목">
                <SelectBox value={subjectId} onChange={onSubjectChange} options={subjectOptions} />
              </Field>
              <Field label="단원">
                <SelectBox value={unitId} onChange={setUnitId} options={unitOptions} />
              </Field>
              <Field label="교재 유형">
                <SelectBox
                  value={type}
                  onChange={setType}
                  options={STUDY_BOOK_TYPES.map((t) => ({ id: t.id, name: t.label }))}
                />
              </Field>
              <Field label="난이도">
                <SelectBox
                  value={difficulty}
                  onChange={(v) => setDifficulty(v as "EASY" | "MEDIUM" | "HARD")}
                  options={Object.entries(DIFFICULTY_LABEL).map(([id, name]) => ({ id, name }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="챕터 수">
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={chapterCount}
                    onChange={(e) => setChapterCount(Number(e.target.value))}
                  />
                </Field>
                <Field label="문항/챕터">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={problemsPerChapter}
                    onChange={(e) => setProblemsPerChapter(Number(e.target.value))}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Sparkles className="text-primary size-4" /> 나만의 교재 지침
              </Label>
              <p className="text-muted-foreground text-xs">
                AI가 교재를 생성할 때 적용할 나만의 규칙을 입력하세요.
              </p>
              <Textarea
                rows={4}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="예: 개념은 쉽게 설명하고, 사고력 문제를 많이 넣어줘. 해설은 단계별로 작성해줘."
                maxLength={1000}
              />
            </div>

            {feedback?.code === "FEATURE_LIMIT_REACHED" ? (
              <UpgradeNotice
                title="교재 생성 한도를 모두 사용했어요"
                message={`${feedback.upgradePlan ?? "상위"} 플랜으로 업그레이드하면 더 많이 만들 수 있어요.`}
                cta={`${feedback.upgradePlan ?? "플랜"} 알아보기`}
              />
            ) : (
              feedback?.error && <p className="text-destructive text-xs">{feedback.error}</p>
            )}

            <Button type="button" onClick={handleSubmit} className="self-end">
              교재 생성하기
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; name: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
