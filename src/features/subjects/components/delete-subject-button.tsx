"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { deleteSubject } from "@/features/subjects/actions";

export function DeleteSubjectButton({ subjectId }: { subjectId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          disabled={isPending}
          aria-label="삭제"
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>과목을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            이 과목과 연결된 Todo·목표·공부 기록은 삭제되지 않고 &ldquo;과목 미지정&rdquo;
            상태로 남습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => startTransition(() => deleteSubject(subjectId))}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
