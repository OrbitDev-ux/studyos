import { Skeleton } from "@/components/ui/skeleton";

export default function GrowthLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 md:gap-10">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-40" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
