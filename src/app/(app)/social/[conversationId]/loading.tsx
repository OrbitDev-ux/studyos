import { Skeleton } from "@/components/ui/skeleton";

// Instant shell for a DM thread (header + message bubbles + input).
export default function ConversationLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="flex flex-1 flex-col gap-3 rounded-lg border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-10 ${i % 2 === 0 ? "w-2/3 self-start" : "w-1/2 self-end"}`}
          />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
