import { z } from "zod";

export const emailSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type EmailSignInValues = z.infer<typeof emailSignInSchema>;

export const emailSignUpSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(50),
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 해요").max(72),
});

export type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;
