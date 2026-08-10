"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BookMarked, Loader2, Trash2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { deleteStudyBook } from "@/features/study-books/actions";
import { studyBookTypeLabel } from "@/features/study-books/types";

export type StudyBookListItem = {
  id: string;
  title: string;
  subjectName: string;
  grade: string;
  unit: string | null;
  type: string;
  chapterCount: number;
  learningRatePercent: number;
};

export function StudyBookGrid({ books }: { books: StudyBookListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteStudyBook(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {books.map((book) => (
        <Card key={book.id} className="transition-shadow hover:shadow-sm">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <BookMarked className="text-primary mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{book.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {book.subjectName} · {book.grade}
                    {book.unit ? ` · ${book.unit}` : ""}
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                    aria-label="교재 삭제"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>교재를 삭제할까요?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &ldquo;{book.title}&rdquo; 교재와 챕터·문제가 모두 삭제됩니다. 이 작업은
                      되돌릴 수 없어요.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(book.id)}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{studyBookTypeLabel(book.type)}</Badge>
              <span className="text-muted-foreground text-xs">챕터 {book.chapterCount}개</span>
            </div>

            <div className="mt-auto flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">학습률</span>
                <span className="tabular-nums">{book.learningRatePercent}%</span>
              </div>
              <Progress value={book.learningRatePercent} className="h-1.5" />
            </div>

            <Button asChild size="sm" className="self-start" disabled={pending}>
              <Link href={`/study-books/${book.id}`}>
                {pending && <Loader2 className="mr-1 size-3.5 animate-spin" />}
                {book.learningRatePercent > 0 ? "계속 학습" : "학습 시작"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
