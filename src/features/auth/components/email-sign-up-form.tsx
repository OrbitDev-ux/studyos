"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { unstable_rethrow } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "@/features/auth/actions";
import { emailSignUpSchema, type EmailSignUpValues } from "@/features/auth/schema";

export function EmailSignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailSignUpValues>({ resolver: zodResolver(emailSignUpSchema) });

  async function onSubmit(values: EmailSignUpValues) {
    setError(null);
    try {
      const result = await signUpWithEmail(values);
      if (result.error) setError(result.error);
    } catch (err) {
      // A successful sign-up redirects to /dashboard (throws NEXT_REDIRECT);
      // re-throw framework signals so navigation proceeds instead of flashing
      // a "failed" message.
      unstable_rethrow(err);
      setError("회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-name">이름</Label>
        <Input id="signup-name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-email">이메일</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signup-password">비밀번호</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "가입 중..." : "이메일로 회원가입"}
      </Button>
    </form>
  );
}
