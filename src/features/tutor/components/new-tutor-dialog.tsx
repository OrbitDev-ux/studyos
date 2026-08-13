"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTutorConversation } from "@/features/tutor/actions";
import { TUTOR_GRADES, TUTOR_SUBJECTS } from "@/features/tutor/config";
import type { TutorGradeId, TutorSubjectId } from "@/features/tutor/config";

export function NewTutorDialog({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<TutorSubjectId>("math");
  const [grade, setGrade] = useState<TutorGradeId>("elem_high");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await createTutorConversation({ subject, grade });
      if (res.error) return setError(res.error);
      setOpen(false);
      if (res.conversationId) router.push(`/tutor/${res.conversationId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className="gap-1.5">
          <Plus className="size-4" /> 새 과외 시작
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🧑‍🏫 새 과외 시작</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tutor-subject">과목</Label>
            <Select value={subject} onValueChange={(v) => setSubject(v as TutorSubjectId)}>
              <SelectTrigger id="tutor-subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TUTOR_SUBJECTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.emoji} {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tutor-grade">학년 수준</Label>
            <Select value={grade} onValueChange={(v) => setGrade(v as TutorGradeId)}>
              <SelectTrigger id="tutor-grade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TUTOR_GRADES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="button" onClick={start} disabled={pending} className="self-end">
            {pending ? "시작하는 중..." : "과외 시작"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
