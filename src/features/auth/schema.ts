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
  // Required legal consents. Enforced here so the SERVER — not just the client —
  // rejects a signup that didn't agree (recorded via LegalConsent on success).
  agreeTerms: z
    .boolean()
    .refine((v) => v === true, { message: "이용약관에 동의해주세요" }),
  agreePrivacy: z
    .boolean()
    .refine((v) => v === true, { message: "개인정보 처리방침에 동의해주세요" }),
});

export type EmailSignUpValues = z.infer<typeof emailSignUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일을 입력해주세요"),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// Reuses the sign-up password policy (min 8 / max 72 = bcrypt limit).
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 해요").max(72),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "비밀번호가 일치하지 않아요",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
