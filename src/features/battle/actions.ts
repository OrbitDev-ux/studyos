"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  createBattleFormSchema,
  type CreateBattleFormValues,
} from "@/features/battle/schema";
import { createNotification, createNotifications, markAsReadByTarget } from "@/features/notifications/service";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUser } from "@/lib/session";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createBattle(values: CreateBattleFormValues): Promise<string> {
  const user = await requireCurrentUser();
  const result = createBattleFormSchema.safeParse(values);
  if (!result.success) {
    // Server Action errors only carry `.message` across to the client — a
    // raw ZodError here would show up as unreadable JSON in the UI.
    throw new Error("입력값을 확인해주세요.");
  }
  const parsed = result.data;
  const supabase = await createClient();

  const { data: friendships, error: friendError } = await supabase
    .from("Friendship")
    .select("requesterId, addresseeId")
    .eq("status", "accepted")
    .or(`requesterId.eq.${user.id},addresseeId.eq.${user.id}`);
  if (friendError) throw friendError;

  const friendIds = new Set(
    (friendships ?? []).map((f) =>
      f.requesterId === user.id ? f.addresseeId : f.requesterId,
    ),
  );
  if (parsed.friendUserIds.some((id) => !friendIds.has(id))) {
    throw new Error("친구가 아닌 사용자는 초대할 수 없습니다.");
  }

  const durationDays = Number(parsed.durationDays);
  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + durationDays * DAY_MS);
  const battleId = randomUUID();

  const { error: battleError } = await supabase.from("Battle").insert({
    id: battleId,
    creatorId: user.id,
    metric: parsed.metric,
    durationDays,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
  });
  if (battleError) throw battleError;

  // A single .insert([...]) call is one INSERT statement (all rows or
  // none), so no partial participant list can land — only the Battle row
  // itself needs cleanup if this fails.
  const { error: participantsError } = await supabase.from("BattleParticipant").insert([
    { id: randomUUID(), battleId, userId: user.id, status: "accepted" },
    ...parsed.friendUserIds.map((friendId) => ({
      id: randomUUID(),
      battleId,
      userId: friendId,
      status: "invited",
    })),
  ]);
  if (participantsError) {
    await supabase.from("Battle").delete().eq("id", battleId);
    throw participantsError;
  }

  const actorName = user.name ?? user.email ?? "";
  await createNotifications(
    parsed.friendUserIds.map((friendId) => ({
      userId: friendId,
      type: "battle_invite" as const,
      title: `${actorName}님이 배틀에 초대했어요`,
      actorId: user.id,
      targetUrl: `/battle/${battleId}`,
      metadata: { actorName, battleId },
    })),
  );

  revalidatePath("/battle");
  return battleId;
}

export async function respondToBattleInvite(battleId: string, accept: boolean) {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("BattleParticipant")
    .select("id")
    .eq("battleId", battleId)
    .eq("userId", user.id)
    .eq("status", "invited")
    .maybeSingle();
  if (!participant) return;

  const { error } = await supabase
    .from("BattleParticipant")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", participant.id);
  if (error) throw error;

  const { data: battle } = await supabase
    .from("Battle")
    .select("creatorId")
    .eq("id", battleId)
    .maybeSingle();
  if (battle) {
    const actorName = user.name ?? user.email ?? "";
    await createNotification({
      userId: battle.creatorId,
      type: "battle_invite_response",
      title: accept ? `${actorName}님이 배틀 초대를 수락했어요` : `${actorName}님이 배틀 초대를 거절했어요`,
      actorId: user.id,
      targetUrl: `/battle/${battleId}`,
      metadata: { actorName, battleId, accepted: accept },
    });
  }
  await markAsReadByTarget(
    user.id,
    "battle_invite",
    (metadata) =>
      !!metadata && typeof metadata === "object" && (metadata as { battleId?: unknown }).battleId === battleId,
  );

  revalidatePath("/battle");
  revalidatePath(`/battle/${battleId}`);
}
