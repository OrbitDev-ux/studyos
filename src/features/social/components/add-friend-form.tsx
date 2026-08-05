"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendFriendRequest } from "@/features/social/actions";
import { addFriendFormSchema, type AddFriendFormValues } from "@/features/social/schema";

export function AddFriendForm() {
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFriendFormValues>({
    resolver: zodResolver(addFriendFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: AddFriendFormValues) {
    setMessage(null);
    try {
      await sendFriendRequest(values.email);
      setMessage({ type: "success", text: "친구 요청을 보냈어요." });
      reset();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "요청에 실패했어요.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Input placeholder="친구 이메일" className="w-56" {...register("email")} />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          친구 추가
        </Button>
      </div>
      {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      {message && (
        <p
          className={
            message.type === "error" ? "text-destructive text-xs" : "text-primary text-xs"
          }
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
