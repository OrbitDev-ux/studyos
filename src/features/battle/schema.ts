import { z } from "zod";
import { BATTLE_DURATION_DAYS, BATTLE_METRICS } from "@/features/battle/constants";

// durationDays stays a string enum ("1" | "3" | "7") here rather than being
// transformed to a number — the Server Action re-parses these same values
// with this schema for defense in depth, and a `.transform(Number)` would
// make that second parse reject the number produced by the first (client)
// parse. Convert to a number in the action after parsing instead.
export const createBattleFormSchema = z.object({
  metric: z.enum(BATTLE_METRICS),
  durationDays: z.enum(BATTLE_DURATION_DAYS),
  friendUserIds: z.array(z.string()).min(1, "최소 한 명의 친구를 초대해주세요"),
});

export type CreateBattleFormValues = z.infer<typeof createBattleFormSchema>;
