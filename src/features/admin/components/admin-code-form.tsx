"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyAdminCode } from "@/features/admin/actions";
import { adminCodeSchema, type AdminCodeValues } from "@/features/admin/schema";

export function AdminCodeForm() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminCodeValues>({ resolver: zodResolver(adminCodeSchema) });

  async function onSubmit(values: AdminCodeValues) {
    setError(null);
    try {
      const result = await verifyAdminCode(values);
      if (result?.error) setError(result.error);
    } catch {
      setError("관리자 코드가 올바르지 않습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-code">Admin Code</Label>
        <Input
          id="admin-code"
          type="password"
          autoComplete="off"
          placeholder="Enter Admin Code"
          {...register("code")}
        />
        {errors.code && <p className="text-destructive text-xs">{errors.code.message}</p>}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "확인 중..." : "Login"}
      </Button>
    </form>
  );
}
