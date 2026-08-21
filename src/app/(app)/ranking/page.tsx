import { LinkTabs } from "@/components/layout/link-tabs";
import { RankingTabs } from "@/features/ranking/components/ranking-tabs";
import {
  getFriendRanking,
  getFriendRankingForRange,
  getGlobalRanking,
  getSchoolRanking,
  getSeasonRanking,
} from "@/features/ranking/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const RANKING_TABS = [
  { href: "/ranking", labelKey: "ranking" },
  { href: "/battle", labelKey: "battle" },
] as const;

export default async function RankingPage() {
  const user = await requireCurrentUser();

  const [global, friends, friendsToday, friendsWeek, school, season] = await Promise.all([
    getGlobalRanking(),
    getFriendRanking(user.id),
    getFriendRankingForRange(user.id, "today", user.timezone),
    getFriendRankingForRange(user.id, "week", user.timezone),
    getSchoolRanking(user.id),
    getSeasonRanking(),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).ranking;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.title}</h1>
        <LinkTabs items={RANKING_TABS} />
      </div>
      <RankingTabs
        currentUserId={user.id}
        global={global}
        friends={friends}
        friendsToday={friendsToday}
        friendsWeek={friendsWeek}
        school={school}
        season={season}
      />
    </div>
  );
}
