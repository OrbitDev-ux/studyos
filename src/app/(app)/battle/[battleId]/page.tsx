import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { BattleLeaderboard } from "@/features/battle/components/battle-leaderboard";
import { CancelBattleButton } from "@/features/battle/components/cancel-battle-button";
import { LeaveBattleButton } from "@/features/battle/components/leave-battle-button";
import { RespondBattleInviteButtons } from "@/features/battle/components/respond-battle-invite-buttons";
import { battleDurationLabel, battleMetricLabel } from "@/features/battle/constants";
import { getBattle } from "@/features/battle/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function BattleDetailPage({
  params,
}: {
  params: Promise<{ battleId: string }>;
}) {
  const { battleId } = await params;
  const user = await requireCurrentUser();
  const result = await getBattle(battleId, user.id);
  if (!result) notFound();

  const { battle, leaderboard, pendingInvites, isActive } = result;
  const myParticipant = battle.participants.find(
    (participant) => participant.userId === user.id,
  );
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).battle;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.detailTitle.replace("{metric}", battleMetricLabel(t, battle.metric))}
        subtitle={
          <>
            {battleDurationLabel(t, String(battle.durationDays))} ·{" "}
            {isActive ? t.statusActive : t.statusEnded}
          </>
        }
      />

      {myParticipant?.status === "invited" && (
        <RespondBattleInviteButtons battleId={battle.id} />
      )}

      {isActive && battle.creatorId === user.id && (
        <div>
          <CancelBattleButton battleId={battle.id} />
        </div>
      )}
      {isActive && battle.creatorId !== user.id && myParticipant?.status === "accepted" && (
        <div>
          <LeaveBattleButton battleId={battle.id} />
        </div>
      )}

      <BattleLeaderboard
        leaderboard={leaderboard}
        metric={battle.metric}
        currentUserId={user.id}
        emptyMessage={t.leaderboardEmpty}
        locale={locale}
      />

      {pendingInvites.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t.pending.replace(
            "{names}",
            pendingInvites.map((p) => p.user.name ?? p.user.email).join(", "),
          )}
        </p>
      )}
    </div>
  );
}
