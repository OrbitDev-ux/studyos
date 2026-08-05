"use client";

import { Star } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/features/problems/actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  problemId,
  isFavorite,
}: {
  problemId: string;
  isFavorite: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      disabled={isPending}
      aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onClick={() => startTransition(() => toggleFavorite(problemId))}
    >
      <Star className={cn("size-4", isFavorite && "fill-yellow-400 text-yellow-400")} />
    </Button>
  );
}
