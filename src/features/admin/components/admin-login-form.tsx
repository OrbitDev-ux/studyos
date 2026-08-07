"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verifyAdminCode, verifyAdminCredentials } from "@/features/admin/actions";
import {
  adminCodeSchema,
  adminCredentialsSchema,
  type AdminCodeValues,
  type AdminCredentialsValues,
} from "@/features/admin/schema";

function CodeForm() {
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
      setError("인증에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-code">관리자 코드</Label>
        <Input
          id="admin-code"
          type="password"
          autoComplete="off"
          placeholder="코드를 입력하세요"
          aria-invalid={Boolean(errors.code)}
          {...register("code")}
        />
        {errors.code && <p className="text-destructive text-xs">{errors.code.message}</p>}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "확인 중..." : "코드로 로그인"}
      </Button>
    </form>
  );
}

function CredentialsForm() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminCredentialsValues>({ resolver: zodResolver(adminCredentialsSchema) });

  async function onSubmit(values: AdminCredentialsValues) {
    setError(null);
    try {
      const result = await verifyAdminCredentials(values);
      if (result?.error) setError(result.error);
    } catch {
      setError("인증에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-email">이메일</Label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-password">비밀번호</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "확인 중..." : "로그인"}
      </Button>
    </form>
  );
}

export function AdminLoginForm() {
  return (
    <Tabs defaultValue="credentials" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="credentials">
          <Lock data-icon="inline-start" />
          계정 로그인
        </TabsTrigger>
        <TabsTrigger value="code">
          <KeyRound data-icon="inline-start" />
          코드 로그인
        </TabsTrigger>
      </TabsList>
      <TabsContent value="credentials" className="pt-4">
        <CredentialsForm />
      </TabsContent>
      <TabsContent value="code" className="pt-4">
        <CodeForm />
      </TabsContent>
    </Tabs>
  );
}
