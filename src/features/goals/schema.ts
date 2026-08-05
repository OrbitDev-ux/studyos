import { z } from "zod";

export const goalFormSchema = z.object({
  title: z.string().trim().min(1, "목표를 입력해주세요").max(100),
  targetValue: z.coerce.number().int().min(1, "1 이상 입력해주세요").max(100000),
  unit: z.string().trim().min(1, "단위를 입력해주세요").max(20),
  subjectId: z.string().optional(),
});

export type GoalFormInput = z.input<typeof goalFormSchema>;
export type GoalFormValues = z.output<typeof goalFormSchema>;
