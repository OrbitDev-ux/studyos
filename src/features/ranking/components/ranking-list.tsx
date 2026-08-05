import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RankingEntry } from "@/features/ranking/queries";
import { formatDurationKorean } from "@/lib/format";
import { cn } from "@/lib/utils";

const DISPLAY_LIMIT = 20;

export function RankingList({
  entries,
  currentUserId,
  emptyMessage = "표시할 랭킹이 없어요.",
}: {
  entries: RankingEntry[];
  currentUserId: string;
  emptyMessage?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  const topEntries = entries.slice(0, DISPLAY_LIMIT);
  const isCurrentUserVisible = topEntries.some((entry) => entry.userId === currentUserId);
  const currentUserEntry = entries.find((entry) => entry.userId === currentUserId);

  return (
    <div className="flex flex-col gap-1.5">
      <ol className="flex flex-col gap-1.5">
        {topEntries.map((entry) => (
          <RankingRow
            key={entry.userId}
            entry={entry}
            isMe={entry.userId === currentUserId}
          />
        ))}
      </ol>
      {!isCurrentUserVisible && currentUserEntry && (
        <>
          <div className="border-t" />
          <ol>
            <RankingRow entry={currentUserEntry} isMe />
          </ol>
        </>
      )}
    </div>
  );
}

function RankingRow({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
        isMe && "bg-primary/5 font-medium",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-muted-foreground w-6 shrink-0 text-right tabular-nums">
          {entry.rank}
        </span>
        <Avatar className="size-6 shrink-0">
          <AvatarImage src={entry.image ?? undefined} alt={entry.name ?? ""} />
          <AvatarFallback>{(entry.name ?? entry.email).at(0)}</AvatarFallback>
        </Avatar>
        <span className="truncate">{entry.name ?? entry.email}</span>
      </span>
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {formatDurationKorean(entry.totalSeconds)}
      </span>
    </li>
  );
}
