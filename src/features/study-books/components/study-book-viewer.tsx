"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { MathText } from "@/components/ui/math-text";
import {
  SolveProblemPanel,
  type SolveProgress,
} from "@/features/problems/components/solve-problem-panel";
import { DIFFICULTY_LABEL } from "@/features/problems/constants";
import { studyBookTypeLabel } from "@/features/study-books/types";
import {
  deleteStudyBook,
  regenerateChapter,
  updateStudyBook,
} from "@/features/study-books/actions";
import {
  addProblemToChapter,
  addWeaknessProblem,
  changeItemDifficulty,
  deleteBookItem,
  generateSimilarProblem,
  moveBookItem,
  regenerateItemExplanation,
} from "@/features/study-books/item-actions";
import type { getStudyBook, StudyBookProgress } from "@/features/study-books/queries";
import { cn } from "@/lib/utils";

type Book = NonNullable<Awaited<ReturnType<typeof getStudyBook>>>;
type Chapter = Book["chapters"][number];
type Item = Chapter["items"][number];

const KIND_LABEL: Record<string, string> = {
  concept: "개념",
  example: "예제",
  practice: "연습 문제",
  application: "응용 문제",
  advanced: "심화 문제",
  review: "복습",
};

export function StudyBookViewer({
  book,
  progress,
}: {
  book: Book;
  progress: StudyBookProgress;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const [regenError, setRegenError] = useState<string | null>(null);
  const chapter: Chapter | undefined = book.chapters[index];

  function goTo(i: number) {
    setIndex(i);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleRegenerate() {
    if (!chapter) return;
    setRegenError(null);
    startTransition(async () => {
      const res = await regenerateChapter(book.id, chapter.id);
      if (res?.error) {
        setRegenError(res.error);
        return;
      }
      router.refresh();
    });
  }
  function handleDelete() {
    startTransition(async () => {
      await deleteStudyBook(book.id);
      router.push("/study-books");
    });
  }
  function runChapterAi(fn: () => Promise<{ error?: string } | void>) {
    if (!chapter) return;
    setRegenError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setRegenError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      {/* Cover / header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">📘 {book.title}</h1>
            <Badge variant="outline">{studyBookTypeLabel(book.type)}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {book.subjectName} · {book.grade}
            {book.unit ? ` · ${book.unit}` : ""} · {DIFFICULTY_LABEL[book.difficulty]}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <EditBookDialog
            bookId={book.id}
            initialTitle={book.title}
            initialInstructions={book.customInstructions ?? ""}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label="교재 삭제"
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>교재를 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 교재와 모든 챕터·문제가 삭제됩니다. 되돌릴 수 없어요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 차별점 서사 — 일반 AI 챗봇과 다른 이유를 즉시 이해시킨다. */}
      <div className="border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-3.5">
        <span className="bg-primary/12 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
          <WandSparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">이 교재는 당신의 취약점에 맞춰 진화합니다</p>
          <p className="text-muted-foreground text-xs">
            틀린 문제와 &lsquo;나만의 교재 지침&rsquo;을 반영해 챕터를 다시 생성할수록,
            당신에게 최적화된 한 권이 완성돼요.
          </p>
        </div>
      </div>

      {/* Progress (from shared Learning-OS data) */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="학습률" value={`${progress.learningRatePercent}%`}>
            <Progress
              value={progress.learningRatePercent}
              className={cn(
                "h-1.5",
                progress.learningRatePercent >= 100 &&
                  "[&>[data-slot=progress-indicator]]:bg-success",
              )}
            />
          </Stat>
          <Stat label="정답률" value={`${progress.accuracyPercent}%`} />
          <Stat
            label="완료 문제"
            value={`${progress.completedProblems} / ${progress.totalProblems}`}
          />
          <Stat label="복습 필요" value={`${progress.reviewNeeded}문제`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Table of contents (sticky on desktop) */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">목차</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-0.5">
              {book.chapters.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    i === index
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted",
                  )}
                >
                  {i + 1}. {c.title}
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        {/* Current chapter */}
        {chapter && (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {index + 1}. {chapter.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={pending}
                  onClick={() => runChapterAi(() => addProblemToChapter(book.id, chapter.id))}
                >
                  <Plus className="size-4" /> 문제 추가
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={pending}
                  onClick={() => runChapterAi(() => addWeaknessProblem(book.id, chapter.id))}
                >
                  <WandSparkles className="size-4" /> 취약점 보완
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleRegenerate}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  챕터 재생성
                </Button>
              </div>
            </div>
            {regenError && <p className="text-destructive text-xs">{regenError}</p>}

            {chapter.concept && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">개념</CardTitle>
                </CardHeader>
                <CardContent>
                  <MathText className="text-sm leading-relaxed">
                    {chapter.concept}
                  </MathText>
                </CardContent>
              </Card>
            )}

            {(() => {
              // 챕터 내 "문제" 아이템만 모아 진행률/다음 문제 이동을 구성한다.
              const problemItems = chapter.items.filter((it) => !!it.problem);
              return chapter.items.map((item, i) => {
                const pIdx = item.problem
                  ? problemItems.findIndex((p) => p.id === item.id)
                  : -1;
                return (
                  <ChapterItem
                    key={item.id}
                    item={item}
                    number={i + 1}
                    bookId={book.id}
                    progress={
                      pIdx >= 0
                        ? { index: pIdx + 1, total: problemItems.length }
                        : undefined
                    }
                    nextProblemId={
                      pIdx >= 0 ? (problemItems[pIdx + 1]?.problem?.id ?? null) : null
                    }
                  />
                );
              });
            })()}

            {chapter.reviewPoints && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">복습 포인트</CardTitle>
                </CardHeader>
                <CardContent>
                  <MathText className="text-muted-foreground text-sm leading-relaxed">
                    {chapter.reviewPoints}
                  </MathText>
                </CardContent>
              </Card>
            )}

            {/* Chapter nav */}
            <div className="flex items-center justify-between border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={index === 0}
                onClick={() => goTo(Math.max(0, index - 1))}
              >
                <ChevronLeft className="size-4" /> 이전
              </Button>
              <span className="text-muted-foreground text-xs tabular-nums">
                {index + 1} / {book.chapters.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={index >= book.chapters.length - 1}
                onClick={() => goTo(Math.min(book.chapters.length - 1, index + 1))}
              >
                다음 <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChapterItem({
  item,
  number,
  bookId,
  progress,
  nextProblemId,
}: {
  item: Item;
  number: number;
  bookId: string;
  progress?: SolveProgress;
  nextProblemId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const label = KIND_LABEL[item.kind] ?? item.kind;
  const isProblem = !!item.problem;

  function run(fn: () => Promise<{ error?: string } | void>) {
    setErr(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setErr(res.error);
      else router.refresh();
    });
  }

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-7 shrink-0"
          disabled={pending}
          aria-label="문제 메뉴"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isProblem && (
          <>
            <DropdownMenuItem onClick={() => run(() => generateSimilarProblem(bookId, item.id))}>
              <Sparkles className="size-4" /> 비슷한 문제 만들기
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run(() => changeItemDifficulty(bookId, item.id, "easier"))}
            >
              더 쉽게
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run(() => changeItemDifficulty(bookId, item.id, "harder"))}
            >
              더 어렵게
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => run(() => regenerateItemExplanation(bookId, item.id))}
            >
              해설 다시 생성
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => run(() => moveBookItem(bookId, item.id, "up"))}>
          <ArrowUp className="size-4" /> 위로
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(() => moveBookItem(bookId, item.id, "down"))}>
          <ArrowDown className="size-4" /> 아래로
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => run(() => deleteBookItem(bookId, item.id))}>
          <Trash2 className="size-4" /> 삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Problem item → reuse the shared solving panel (records to Learning OS).
  if (isProblem) {
    return (
      <Card id={`problem-${item.problem!.id}`} className="scroll-mt-20 outline-none">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{label}</Badge>
              <span className="text-muted-foreground text-xs">문제 {number}</span>
            </div>
            {menu}
          </div>
          <MathText className="text-sm font-medium">{item.problem!.prompt}</MathText>
          {/* Key by problem.id: 난이도 변경/재생성으로 이 아이템의 problemId가
              바뀌면 패널을 remount해 이전 문제의 풀이/정답 상태가 새 문제에
              남지 않도록 한다(item.id는 그대로라 key만으로는 리셋되지 않음). */}
          <SolveProblemPanel
            key={item.problem!.id}
            problem={item.problem!}
            progress={progress}
            nextProblemId={nextProblemId}
          />
          {err && <p className="text-destructive text-xs">{err}</p>}
        </CardContent>
      </Card>
    );
  }

  // Prose item (example).
  return (
    <Card className="bg-muted/30">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="self-start">
            {label}
          </Badge>
          {menu}
        </div>
        <MathText className="text-sm leading-relaxed">{item.content}</MathText>
        {err && <p className="text-destructive text-xs">{err}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {children}
    </div>
  );
}

function EditBookDialog({
  bookId,
  initialTitle,
  initialInstructions,
}: {
  bookId: string;
  initialTitle: string;
  initialInstructions: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateStudyBook(bookId, {
        title: title.trim() || undefined,
        customInstructions: instructions.trim() || null,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="교재 수정">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>교재 수정</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>나만의 교재 지침</Label>
            <p className="text-muted-foreground text-xs">
              스타일·설명 방식 힌트로만 사용돼요. 챕터 재생성 시 자동 적용됩니다.
            </p>
            <Textarea
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={1000}
              placeholder="예: 해설은 단계별로 자세하게 작성해줘."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
