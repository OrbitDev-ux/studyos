import { RankingTabs } from "@/features/ranking/components/ranking-tabs";
import {
  getFriendRanking,
  getGlobalRanking,
  getSchoolRanking,
  getSeasonRanking,
} from "@/features/ranking/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function RankingPage() {
  const user = await requireCurrentUser();

  const [global, friends, school, season] = await Promise.all([
    getGlobalRanking(),
    getFriendRanking(user.id),
    getSchoolRanking(user.id),
    getSeasonRanking(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">랭킹</h1>
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
