import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
