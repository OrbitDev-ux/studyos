import { z } from "zod";
import { MISSION_TYPES } from "@/features/growth/mission-types";

export const createMissionFormSchema = z.object({
  title: z.string().trim().min(1, "미션 이름을 입력해주세요").max(100),
  description: z.string().trim().max(500).optional(),
  type: z.enum(MISSION_TYPES),
  targetValue: z.coerce.number().int().min(1, "1 이상 입력해주세요").max(100_000),
  subjectId: z.string().optional(),
  // An <input type="date"> submits "" when left blank, which z.coerce.date()
  // would otherwise turn into an Invalid Date instead of "not set".
  dueAt: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.date().optional(),
  ),
});

export type CreateMissionFormInput = z.input<typeof createMissionFormSchema>;
export type CreateMissionFormValues = z.output<typeof createMissionFormSchema>;
