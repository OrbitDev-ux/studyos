"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/features/auth/reset-actions";
import { resetPasswordSchema, type ResetPasswordValues } from "@/features/auth/schema";

/** New-password form. Token comes from the URL; server re-validates it. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setError(null);
    try {
      const res = await resetPassword(values);
      if (res.ok) setDone(true);
      else setError(res.error);
    } catch {
      setError("비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-muted/50 rounded-lg border p-4 text-sm">
          <p className="font-medium">비밀번호가 변경되었어요</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            새 비밀번호로 다시 로그인해주세요. 기존에 로그인된 다른 기기는 자동으로
            로그아웃됩니다.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <input type="hidden" {...register("token")} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password">새 비밀번호</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-confirm">새 비밀번호 확인</Label>
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "변경 중..." : "비밀번호 변경"}
      </Button>
    </form>
  );
}
