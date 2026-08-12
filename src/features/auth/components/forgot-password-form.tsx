"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/reset-actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/features/auth/schema";

/**
 * 계정 찾기 / 비밀번호 재설정 시작 폼. 성공/실패와 무관하게 동일한 안내 문구를
 * 보여줘 계정 존재 여부를 노출하지 않는다(enumeration 방지).
 */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null);
    try {
      const res = await requestPasswordReset(values);
      setSent(res.message);
    } catch {
      setError("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  if (sent) {
    return (
      <div className="bg-muted/50 rounded-lg border p-4 text-sm">
        <p className="font-medium">확인해주세요</p>
        <p className="text-muted-foreground mt-1 leading-relaxed">{sent}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">이메일</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="가입할 때 사용한 이메일"
          {...register("email")}
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "요청 중..." : "재설정 링크 받기"}
      </Button>
    </form>
  );
}
