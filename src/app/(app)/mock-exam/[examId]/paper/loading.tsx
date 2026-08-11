import { Skeleton } from "@/components/ui/skeleton";

// Instant shell for the printable exam paper.
export default function ExamPaperLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex flex-col gap-3 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
