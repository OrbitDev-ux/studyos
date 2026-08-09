import { CalendarDays, Mail, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { getMyProfile } from "@/features/profile/queries";
import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { getPlanSummary } from "@/features/billing/usage";
import { requireCurrentUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const [profile, planSummary] = await Promise.all([
    getMyProfile(user.id),
    getPlanSummary(user.id),
  ]);
  const joined = profile.createdAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <ProfileHeader profile={profile} />
        </CardContent>
      </Card>

      <SubscriptionCard summary={planSummary} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 정보</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <InfoRow icon={<Mail className="size-4" />} label="이메일" value={profile.email} />
          <InfoRow
            icon={<CalendarDays className="size-4" />}
            label="가입일"
            value={joined}
          />
          <InfoRow
            icon={<Users className="size-4" />}
            label="친구"
            value={`${profile.friendCount}명`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
