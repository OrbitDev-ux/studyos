import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditProfileDialog } from "@/features/profile/components/edit-profile-dialog";
import { OnlineStatusLabel } from "@/features/profile/components/online-status";
import type { getMyProfile } from "@/features/profile/queries";

/** Header block of the /profile page: avatar, nickname, status message, online
 * state, and the edit action. Split from the page so it can be reused. */
export function ProfileHeader({
  profile,
}: {
  profile: Awaited<ReturnType<typeof getMyProfile>>;
}) {
  const displayName = profile.name ?? "이름 없음";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <Avatar className="size-24" size="lg">
        <AvatarImage src={profile.image ?? undefined} alt={displayName} />
        <AvatarFallback className="text-3xl">{displayName.at(0)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
          <OnlineStatusLabel
            status={profile.onlineStatus}
            className="text-muted-foreground"
          />
        </div>
        <p className="text-sm">
          {profile.bio ? (
            profile.bio
          ) : (
            <span className="text-muted-foreground">상태 메시지가 없어요.</span>
          )}
        </p>
      </div>

      <EditProfileDialog
        initial={{
          nickname: profile.name ?? "",
          bio: profile.bio ?? "",
          avatarUrl: profile.image ?? "",
        }}
      />
    </div>
  );
}
