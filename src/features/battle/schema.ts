import { z } from "zod";
import { BATTLE_DURATION_DAYS, BATTLE_METRICS } from "@/features/battle/constants";

export const createBattleFormSchema = z.object({
  metric: z.enum(BATTLE_METRICS),
  durationDays: z.enum(BATTLE_DURATION_DAYS).transform(Number),
  friendUserIds: z.array(z.string()).min(1, "최소 한 명의 친구를 초대해주세요"),
});

export type CreateBattleFormInput = z.input<typeof createBattleFormSchema>;
export type CreateBattleFormValues = z.output<typeof createBattleFormSchema>;
