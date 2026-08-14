"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { addPlanTasksToTodos, generateStudyPlan } from "@/features/planner/actions";
import type { PlannerCopy } from "@/features/planner/copy";
import type { StudyPlan } from "@/features/planner/schema";

export function StudyPlannerDialog({ copy }: { copy: PlannerCopy }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [examDays, setExamDays] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [adding, startAdding] = useTransition();

  const selectedTasks = useMemo(
    () => (plan ? plan.tasks.filter((_, i) => selected.has(i)) : []),
    [plan, selected],
  );

  function reset() {
    setGoal("");
    setExamDays("");
    setPlan(null);
    setSelected(new Set());
    setError(null);
  }

  function generate() {
    setError(null);
    startGenerating(async () => {
      const days = examDays.trim() === "" ? undefined : Number(examDays);
      const res = await generateStudyPlan({
        goal: goal.trim() || undefined,
        examDays: Number.isFinite(days) ? days : undefined,
      });
      if (res.error || !res.plan) {
        setError(res.error ?? copy.error);
        return;
      }
      setPlan(res.plan);
      setSelected(new Set(res.plan.tasks.map((_, i) => i)));
    });
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function commit() {
    if (selectedTasks.length === 0) return;
    startAdding(async () => {
      const res = await addPlanTasksToTodos({ tasks: selectedTasks });
      if (res.error || !res.count) {
        setError(res.error ?? copy.error);
        return;
      }
      toast({ title: copy.added.replace("{count}", String(res.count)) });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="size-4" /> {copy.open}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">{copy.intro}</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-goal">{copy.goalLabel}</Label>
            <Textarea
              id="plan-goal"
              value={goal}
              rows={2}
              maxLength={300}
              placeholder={copy.goalPlaceholder}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plan-exam-days">{copy.examDaysLabel}</Label>
            <Input
              id="plan-exam-days"
              type="number"
              min={0}
              max={365}
              inputMode="numeric"
              value={examDays}
              placeholder={copy.examDaysPlaceholder}
              onChange={(e) => setExamDays(e.target.value)}
              className="w-32"
            />
          </div>

          <Button type="button" onClick={generate} disabled={generating} className="self-start">
            {generating ? copy.generating : copy.generate}
          </Button>

          {plan && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{copy.planTitle}</p>
              <p className="text-muted-foreground text-sm">{plan.summary}</p>
              <ul className="flex flex-col gap-1.5">
                {plan.tasks.map((task, i) => (
                  <li
                    key={`${task.subject}-${i}`}
                    className="flex items-start gap-2 rounded-md border px-3 py-2"
                  >
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggle(i)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="text-muted-foreground">{task.subject} · </span>
                        {task.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {copy.minutes.replace("{minutes}", String(task.estimatedMinutes))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                onClick={commit}
                disabled={adding || selectedTasks.length === 0}
                className="self-end"
              >
                {adding ? copy.adding : copy.addToTodos}
              </Button>
            </div>
          )}

          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
