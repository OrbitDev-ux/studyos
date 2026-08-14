import { CalendarDays, Mail, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { getMyProfile } from "@/features/profile/queries";
import { SubscriptionCard } from "@/features/billing/components/subscription-card";
import { getPlanSummary } from "@/features/billing/usage";
import { AchievementsSection } from "@/features/achievements/components/achievements-section";
import { getAchievementCopy } from "@/features/achievements/copy";
import { getAchievements } from "@/features/achievements/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireCurrentUser();
  const [profile, planSummary, achievements] = await Promise.all([
    getMyProfile(user.id),
    getPlanSummary(user.id),
    getAchievements(user.id, user.timezone),
  ]);
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).profile;
  const achievementCopy = getAchievementCopy(locale);
  const joined = profile.createdAt.toLocaleDateString(locale, {
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

      <AchievementsSection
        items={achievements.items}
        earnedCount={achievements.earnedCount}
        copy={achievementCopy}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.infoTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <InfoRow icon={<Mail className="size-4" />} label={t.email} value={profile.email} />
          <InfoRow
            icon={<CalendarDays className="size-4" />}
            label={t.joinedAt}
            value={joined}
          />
          <InfoRow
            icon={<Users className="size-4" />}
            label={t.friends}
            value={t.friendCount.replace("{count}", String(profile.friendCount))}
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
