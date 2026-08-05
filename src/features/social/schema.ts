import { z } from "zod";

export const addFriendFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
});

export type AddFriendFormValues = z.infer<typeof addFriendFormSchema>;
