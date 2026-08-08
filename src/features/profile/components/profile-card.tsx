"use client";

import { MessageCircle, UserMinus, UserPlus, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicProfile, requestFriendByUserId } from "@/features/profile/actions";
import { OnlineStatusLabel } from "@/features/profile/components/online-status";
import type { PublicProfile } from "@/features/profile/queries";
import { removeFriend, respondToFriendRequest, startConversation } from "@/features/social/actions";

/**
 * A reusable user profile card shown in a modal. Wrap any element (avatar,
 * name, list row) as the trigger; the card fetches the target's public profile
 * on open and renders friend/message actions driven by the relationship. Used
 * from the friends list, conversation list, and conversation header.
 */
export function ProfileCard({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const data = await fetchPublicProfile(userId);
      if (data) setProfile(data);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {loading || (!profile && !notFound) ? (
          <ProfileCardSkeleton />
        ) : notFound || !profile ? (
          <div className="py-6 text-center">
            <DialogTitle className="text-base">프로필을 볼 수 없어요</DialogTitle>
            <DialogDescription className="mt-1">
              존재하지 않거나 접근할 수 없는 사용자입니다.
            </DialogDescription>
          </div>
        ) : (
          <ProfileCardBody profile={profile} onChanged={load} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileCardBody({
  profile,
  onChanged,
}: {
  profile: PublicProfile;
  onChanged: () => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const displayName = profile.name ?? "이름 없음";
  const joined = new Date(profile.createdAt).toLocaleDateString("ko-KR");

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "요청에 실패했어요.");
      }
    });
  };

  const goToConversation = () =>
    run(async () => {
      const conversationId = await startConversation(profile.id);
      router.push(`/social/${conversationId}`);
    });

  const status = profile.friendStatus;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <DialogTitle className="sr-only">{displayName} 프로필</DialogTitle>
      <DialogDescription className="sr-only">
        {displayName}님의 프로필 카드
      </DialogDescription>

      <Avatar className="size-20" size="lg">
        <AvatarImage src={profile.image ?? undefined} alt={displayName} />
        <AvatarFallback className="text-2xl">{displayName.at(0)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-semibold">{displayName}</p>
        <OnlineStatusLabel status={profile.onlineStatus} className="text-muted-foreground" />
      </div>

      {profile.bio && <p className="text-sm break-words">{profile.bio}</p>}

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span>친구 {profile.friendCount}명</span>
        <span aria-hidden>·</span>
        <span>{joined} 가입</span>
      </div>

      <div className="mt-2 flex w-full flex-wrap justify-center gap-2">
        {status.kind === "self" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/profile")}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" /> 프로필 수정
          </Button>
        ) : (
          <>
            {/* Messaging requires an accepted friendship (startConversation
                enforces it server-side); only offer it to friends. */}
            {status.kind === "friends" && (
              <Button
                size="sm"
                onClick={goToConversation}
                disabled={isPending}
                className="gap-1.5"
              >
                <MessageCircle className="size-3.5" /> 메시지
              </Button>
            )}

            {status.kind === "none" && (
              <Button
                size="sm"
                onClick={() => run(async () => {
                  await requestFriendByUserId(profile.id);
                  await onChanged();
                })}
                disabled={isPending}
                className="gap-1.5"
              >
                <UserPlus className="size-3.5" /> 친구 추가
              </Button>
            )}

            {status.kind === "outgoing" && (
              <Button size="sm" variant="secondary" disabled>
                요청 보냄
              </Button>
            )}

            {status.kind === "incoming" && (
              <>
                <Button
                  size="sm"
                  onClick={() => run(async () => {
                    await respondToFriendRequest(status.friendshipId, true);
                    await onChanged();
                  })}
                  disabled={isPending}
                >
                  수락
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(async () => {
                    await respondToFriendRequest(status.friendshipId, false);
                    await onChanged();
                  })}
                  disabled={isPending}
                >
                  거절
                </Button>
              </>
            )}

            {status.kind === "friends" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => run(async () => {
                  await removeFriend(status.friendshipId);
                  await onChanged();
                })}
                disabled={isPending}
                className="gap-1.5"
              >
                <UserMinus className="size-3.5" /> 친구 삭제
              </Button>
            )}
          </>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function ProfileCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <DialogTitle className="sr-only">프로필 불러오는 중</DialogTitle>
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}
