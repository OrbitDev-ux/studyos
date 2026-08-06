"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail } from "@/features/auth/actions";
import { emailSignInSchema, type EmailSignInValues } from "@/features/auth/schema";

export function EmailSignInForm() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailSignInValues>({ resolver: zodResolver(emailSignInSchema) });

  async function onSubmit(values: EmailSignInValues) {
    setError(null);
    try {
      const result = await signInWithEmail(values);
      if (result.error) setError(result.error);
    } catch {
      setError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signin-email">이메일</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signin-password">비밀번호</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "로그인 중..." : "이메일로 로그인"}
      </Button>
    </form>
  );
}
