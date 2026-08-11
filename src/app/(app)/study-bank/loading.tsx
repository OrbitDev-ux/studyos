import { Skeleton } from "@/components/ui/skeleton";

export default function StudyBankLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-1 h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
