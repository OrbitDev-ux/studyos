import { z } from "zod";

export const schoolFormSchema = z.object({
  school: z.string().trim().min(1, "학교명을 입력해주세요").max(50),
});

export type SchoolFormValues = z.infer<typeof schoolFormSchema>;
