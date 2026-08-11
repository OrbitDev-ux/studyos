import { Skeleton } from "@/components/ui/skeleton";

// Instant shell for taking an exam (title + timer + OMR grid).
export default function TakeExamLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-9 w-24 self-end" />
    </div>
  );
}
