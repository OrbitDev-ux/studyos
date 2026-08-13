"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTutorConversation } from "@/features/tutor/actions";
import { tutorSubjectLabel } from "@/features/tutor/config";
import { cn } from "@/lib/utils";

type ConvoSummary = { id: string; title: string; subject: string; updatedAt: string };

export function TutorConversationList({
  conversations,
  activeId,
}: {
  conversations: ConvoSummary[];
  activeId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteTutorConversation(id);
      if (id === activeId) router.push("/tutor");
      else router.refresh();
    });
  }

  if (conversations.length === 0) {
    return <p className="text-muted-foreground px-1 text-sm">아직 과외 대화가 없어요.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {conversations.map((c) => (
        <li key={c.id} className="group flex items-center gap-1">
          <Link
            href={`/tutor/${c.id}`}
            className={cn(
              "min-w-0 flex-1 rounded-md px-2.5 py-2 text-sm transition-colors",
              c.id === activeId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
            )}
          >
            <span className="block truncate">{c.title}</span>
            <span className="text-muted-foreground text-xs">
              {tutorSubjectLabel(c.subject)} · {new Date(c.updatedAt).toLocaleDateString("ko-KR")}
            </span>
          </Link>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={pending}
            className="text-muted-foreground hover:text-destructive shrink-0"
            aria-label="대화 삭제"
            onClick={() => remove(c.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
