import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant fallback for app routes without a page-specific loading boundary.
 * Keeping the shell lightweight makes sidebar navigation feel immediate while
 * the destination's server queries complete.
 */
export default function AppLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8"
      aria-busy="true"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}
