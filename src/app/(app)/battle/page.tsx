import { Button } from "@/components/ui/button";
import { BattleCard } from "@/features/battle/components/battle-card";
import { BattleCreateDialog } from "@/features/battle/components/battle-create-dialog";
import { getBattles } from "@/features/battle/queries";
import { getFriends } from "@/features/social/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function BattlePage() {
  const user = await requireCurrentUser();

  const [battles, friends] = await Promise.all([
    getBattles(user.id),
    getFriends(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).battle;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.listTitle}</h1>
        <BattleCreateDialog
          friends={friends}
          trigger={
            <Button type="button" size="sm" disabled={friends.length === 0}>
              {t.start}
            </Button>
          }
        />
      </div>
      {battles.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.listEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {battles.map((battle) => (
            <BattleCard key={battle.id} battle={battle} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
