import { RankingTabs } from "@/features/ranking/components/ranking-tabs";
import {
  getFriendRanking,
  getGlobalRanking,
  getSchoolRanking,
  getSeasonRanking,
} from "@/features/ranking/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function RankingPage() {
  const user = await requireCurrentUser();

  const [global, friends, school, season] = await Promise.all([
    getGlobalRanking(),
    getFriendRanking(user.id),
    getSchoolRanking(user.id),
    getSeasonRanking(),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).ranking;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <RankingTabs
        currentUserId={user.id}
        global={global}
        friends={friends}
        school={school}
        season={season}
      />
    </div>
  );
}
