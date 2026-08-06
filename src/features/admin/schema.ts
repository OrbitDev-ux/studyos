import { z } from "zod";

export const adminCodeSchema = z.object({
  code: z.string().min(1, "관리자 코드를 입력해주세요"),
});

export type AdminCodeValues = z.infer<typeof adminCodeSchema>;
