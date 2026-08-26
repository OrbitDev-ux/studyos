import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LinkTabs } from "@/components/layout/link-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { BattleCard } from "@/features/battle/components/battle-card";
import { BattleCreateDialog } from "@/features/battle/components/battle-create-dialog";
import { getBattles } from "@/features/battle/queries";
import { getFriends } from "@/features/social/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

const BATTLE_TABS = [
  { href: "/ranking", labelKey: "ranking" },
  { href: "/battle", labelKey: "battle" },
] as const;

export default async function BattlePage() {
  const user = await requireCurrentUser();

  const [battles, friends] = await Promise.all([
    getBattles(user.id),
    getFriends(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).battle;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:gap-8">
      <LinkTabs items={BATTLE_TABS} />

      <PageHeader
        title={t.listTitle}
        actions={
          <BattleCreateDialog
            friends={friends}
            trigger={
              <Button type="button" size="sm" disabled={friends.length === 0}>
                {t.start}
              </Button>
            }
          />
        }
      />
      {battles.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex min-h-32 items-center justify-center px-5 text-center text-sm">
            {t.listEmpty}
          </CardContent>
        </Card>
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
