import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-7 w-20" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-12" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-48" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-32" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
