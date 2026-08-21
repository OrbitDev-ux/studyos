"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatusDot } from "@/features/profile/components/online-status";
import { ProfileCard } from "@/features/profile/components/profile-card";
import type { OnlineStatus } from "@/features/profile/presence";
import { cn } from "@/lib/utils";

/**
 * A clickable avatar + name that opens the user's ProfileCard. Drop-in for the
 * static avatar/name blocks in the friends list, conversation list, and
 * conversation header so every user reference in the chat UI opens the profile.
 */
export function ProfileNameplate({
  userId,
  name,
  image,
  fallbackLabel,
  status,
  avatarClassName,
  nameClassName,
  className,
}: {
  userId: string;
  name: string | null;
  image: string | null;
  /** Shown (and used for the avatar initial) when name is null, e.g. email. */
  fallbackLabel?: string | null;
  /** Optional presence dot overlaid on the avatar (chat/friend lists). Omit
   * to render without one — this is purely additive, every existing caller
   * is unaffected. */
  status?: OnlineStatus;
  avatarClassName?: string;
  nameClassName?: string;
  className?: string;
}) {
  const display = name ?? fallbackLabel ?? "?";

  return (
    <ProfileCard userId={userId}>
      <button
        type="button"
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md text-left transition-opacity hover:opacity-80",
          className,
        )}
      >
        <span className="relative shrink-0">
          <Avatar className={cn("size-8", avatarClassName)}>
            <AvatarImage src={image ?? undefined} alt={name ?? ""} />
            <AvatarFallback>{display.at(0)}</AvatarFallback>
          </Avatar>
          {status && (
            <OnlineStatusDot
              status={status}
              className="ring-background absolute right-0 bottom-0 ring-2"
            />
          )}
        </span>
        <span className={cn("truncate text-sm font-medium", nameClassName)}>{display}</span>
      </button>
    </ProfileCard>
  );
}
