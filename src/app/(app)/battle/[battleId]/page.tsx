import { notFound } from "next/navigation";
import { BattleLeaderboard } from "@/features/battle/components/battle-leaderboard";
import { RespondBattleInviteButtons } from "@/features/battle/components/respond-battle-invite-buttons";
import { BATTLE_DURATION_LABEL, BATTLE_METRIC_LABEL } from "@/features/battle/constants";
import { getBattle } from "@/features/battle/queries";
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {BATTLE_METRIC_LABEL[battle.metric as keyof typeof BATTLE_METRIC_LABEL]} 배틀
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {BATTLE_DURATION_LABEL[String(battle.durationDays)]} ·{" "}
          {isActive ? "진행 중" : "종료됨"}
        </p>
      </div>

      {myParticipant?.status === "invited" && (
        <RespondBattleInviteButtons battleId={battle.id} />
      )}

      <BattleLeaderboard
        leaderboard={leaderboard}
        metric={battle.metric}
        currentUserId={user.id}
      />

      {pendingInvites.length > 0 && (
        <p className="text-muted-foreground text-xs">
          응답 대기 중:{" "}
          {pendingInvites.map((p) => p.user.name ?? p.user.email).join(", ")}
        </p>
      )}
    </div>
  );
}
