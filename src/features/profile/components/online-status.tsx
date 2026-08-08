import {
  STATUS_DOT_CLASS,
  STATUS_LABEL,
  type OnlineStatus,
} from "@/features/profile/presence";
import { cn } from "@/lib/utils";

/** A colored presence dot, optionally with its label. Used on profile cards
 * and as an avatar overlay in chat/friend lists. */
export function OnlineStatusDot({
  status,
  className,
}: {
  status: OnlineStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", STATUS_DOT_CLASS[status], className)}
      aria-hidden
    />
  );
}

export function OnlineStatusLabel({
  status,
  className,
}: {
  status: OnlineStatus;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <OnlineStatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}
