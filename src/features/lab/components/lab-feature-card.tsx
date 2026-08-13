"use client";

import Link from "next/link";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  runAutoBookEnhancement,
  runCoach,
  runNextLearning,
  submitLabVote,
  type CoachRunResult,
  type NextLearningRunResult,
} from "@/features/lab/actions";
import { LAB_STATUS_LABEL, LAB_STATUS_VARIANT } from "@/features/lab/registry";
import { createTicket } from "@/features/support/actions";
import type { LabBook, LabCardData } from "@/features/lab/components/lab-board";
import { cn } from "@/lib/utils";

type CoachData = NonNullable<CoachRunResult["coach"]>;
type NextItems = NonNullable<NextLearningRunResult["items"]>;

export function LabFeatureCard({ card, books }: { card: LabCardData; books: LabBook[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [coach, setCoach] = useState<CoachData | null>(null);
  const [nextItems, setNextItems] = useState<NextItems | null>(null);
  const [bookId, setBookId] = useState<string>(books[0]?.id ?? "");
  const [done, setDone] = useState<string | null>(null);

  // Feedback (optimistic).
  const [vote, setVote] = useState(card.myVote);
  const [likes, setLikes] = useState(card.likes);
  const [dislikes, setDislikes] = useState(card.dislikes);

  function reset() {
    setError(null);
    setEmpty(false);
    setCoach(null);
    setNextItems(null);
    setDone(null);
  }

  function run() {
    reset();
    startTransition(async () => {
      try {
        if (card.key === "AI_LEARNING_COACH") {
          const res = await runCoach();
          if (res.empty) return setEmpty(true);
          if (res.error) return setError(res.error);
          if (res.coach) setCoach(res.coach);
        } else if (card.key === "NEXT_LEARNING_RECOMMENDATION") {
          const res = await runNextLearning();
          if (res.error) return setError(res.error);
          if (res.empty) return setEmpty(true);
          setNextItems(res.items ?? []);
        } else if (card.key === "AUTO_BOOK_ENHANCEMENT") {
          if (!bookId) return setError("보강할 교재를 선택해주세요.");
          const res = await runAutoBookEnhancement(bookId);
          if (res.error) return setError(res.error);
          setDone(res.chapterTitle ?? null);
          router.refresh();
        }
      } catch {
        setError("실행에 실패했어요. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function castVote(next: "LIKE" | "DISLIKE") {
    const prev = vote;
    // Optimistic update.
    if (prev === "LIKE") setLikes((n) => n - 1);
    if (prev === "DISLIKE") setDislikes((n) => n - 1);
    if (next === "LIKE") setLikes((n) => n + 1);
    if (next === "DISLIKE") setDislikes((n) => n + 1);
    setVote(next);
    void submitLabVote(card.key, next).then((res) => {
      if (res.error) toast({ title: res.error });
    });
  }

  const isAutoBook = card.key === "AUTO_BOOK_ENHANCEMENT";
  const noBooks = isAutoBook && books.length === 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              {card.emoji}
            </span>
            <h2 className="text-base font-semibold">{card.name}</h2>
          </div>
          <Badge variant={LAB_STATUS_VARIANT[card.status]}>
            {LAB_STATUS_LABEL[card.status]}
          </Badge>
        </div>

        <p className="text-muted-foreground text-sm">{card.description}</p>

        {/* Auto-book: choose a target 교재 */}
        {isAutoBook &&
          (noBooks ? (
            <p className="text-muted-foreground text-xs">
              먼저{" "}
              <Link href="/study-books" className="text-primary hover:underline">
                나만의 교재
              </Link>
              를 만들면 취약점을 자동으로 보강할 수 있어요.
            </p>
          ) : (
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger className="sm:w-64">
                <SelectValue placeholder="보강할 교재 선택" />
              </SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={run} disabled={pending || noBooks} className="gap-1.5">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "실행 중..." : card.cta}
          </Button>

          {/* Feedback */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={vote === "LIKE" ? "secondary" : "ghost"}
              className="gap-1"
              onClick={() => castVote("LIKE")}
              aria-label="좋아요"
            >
              <ThumbsUp className="size-4" /> {likes}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vote === "DISLIKE" ? "secondary" : "ghost"}
              className="gap-1"
              onClick={() => castVote("DISLIKE")}
              aria-label="별로예요"
            >
              <ThumbsDown className="size-4" /> {dislikes}
            </Button>
            <FeedbackDialog featureName={card.name} />
          </div>
        </div>

        {/* Loading detail (AI features can take a few seconds). */}
        {pending && card.key === "AI_LEARNING_COACH" && (
          <div className="text-muted-foreground bg-muted/40 rounded-md p-3 text-xs">
            🧠 학습 기록 분석 중... 최근 학습·오답·취약 단원을 확인하고 있어요.
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        {empty && (
          <p className="text-muted-foreground text-sm">
            분석할 학습 기록이 아직 부족해요. 문제를 조금 더 풀어보면 추천을 받을 수 있어요.
          </p>
        )}

        {coach && <CoachView coach={coach} />}
        {nextItems && <NextLearningView items={nextItems} />}
        {done !== null && (
          <div className="bg-success/10 border-success/20 rounded-md border p-3 text-sm">
            <p className="font-medium">교재 보강 완료 🎉</p>
            <p className="text-muted-foreground mt-1">
              {done ? `‘${done}’ 챕터` : "교재"}에 취약점 보완 문제를 추가했어요.{" "}
              <Link href={`/study-books/${bookId}`} className="text-primary hover:underline">
                교재에서 확인하기
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoachView({ coach }: { coach: CoachData }) {
  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-md p-3 text-sm">
      <Section title="오늘 학습" body={coach.todayFocus} />
      <Section title="복습" body={coach.reviewFocus} />
      {coach.weakUnits.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold">취약 단원</p>
          <div className="flex flex-wrap gap-1.5">
            {coach.weakUnits.map((u, i) => (
              <Badge key={i} variant="outline">
                {u}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {coach.studyOrder.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold">추천 학습 순서</p>
          <ol className="text-muted-foreground list-decimal space-y-0.5 pl-5">
            {coach.studyOrder.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      <p className="text-primary text-xs">{coach.encouragement}</p>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold">{title}</p>
      <p className="text-muted-foreground whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function NextLearningView({ items }: { items: NextItems }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i}>
          <Link
            href={it.href}
            className="hover:border-primary/40 block rounded-md border p-3 transition-colors"
          >
            <p className="text-sm font-medium">{it.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{it.reason}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** 의견 보내기 — reuses the existing support ticket system (no new channel). */
function FeedbackDialog({ featureName }: { featureName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!content.trim()) return setError("의견을 입력해주세요.");
    startTransition(async () => {
      const res = await createTicket({
        type: "FEATURE_REQUEST",
        title: `[실험실] ${featureName} 의견`,
        content,
      });
      if (res.error) return setError(res.error);
      toast({ title: "의견이 접수되었습니다. 감사합니다!" });
      setOpen(false);
      setContent("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="gap-1">
          💬 <span className="hidden sm:inline">의견</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>💬 {featureName} 의견 보내기</DialogTitle>
        </DialogHeader>
        <div className={cn("flex flex-col gap-3")}>
          <Textarea
            rows={4}
            value={content}
            maxLength={5000}
            placeholder="이 실험 기능에 대한 의견을 자유롭게 남겨주세요."
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="button" onClick={submit} disabled={pending} className="self-end">
            {pending ? "보내는 중..." : "의견 보내기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
