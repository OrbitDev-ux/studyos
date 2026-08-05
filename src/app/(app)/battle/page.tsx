import { Button } from "@/components/ui/button";
import { BattleCard } from "@/features/battle/components/battle-card";
import { BattleCreateDialog } from "@/features/battle/components/battle-create-dialog";
import { getBattles } from "@/features/battle/queries";
import { getFriends } from "@/features/social/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function BattlePage() {
  const user = await requireCurrentUser();

  const [battles, friends] = await Promise.all([
    getBattles(user.id),
    getFriends(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">공부 배틀</h1>
        <BattleCreateDialog
          friends={friends}
          trigger={
            <Button type="button" size="sm" disabled={friends.length === 0}>
              배틀 시작
            </Button>
          }
        />
      </div>
      {battles.length === 0 ? (
        <p className="text-muted-foreground text-sm">아직 참여 중인 배틀이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} />
          ))}
        </div>
      )}
    </div>
  );
}
