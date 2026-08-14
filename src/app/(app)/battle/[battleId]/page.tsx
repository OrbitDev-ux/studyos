import { notFound } from "next/navigation";
import { BattleLeaderboard } from "@/features/battle/components/battle-leaderboard";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.detailTitle.replace("{metric}", battleMetricLabel(t, battle.metric))}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {battleDurationLabel(t, String(battle.durationDays))} ·{" "}
          {isActive ? t.statusActive : t.statusEnded}
        </p>
      </div>

      {myParticipant?.status === "invited" && (
        <RespondBattleInviteButtons battleId={battle.id} />
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
