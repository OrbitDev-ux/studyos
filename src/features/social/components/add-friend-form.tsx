"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendFriendRequest } from "@/features/social/actions";
import { addFriendFormSchema, type AddFriendFormValues } from "@/features/social/schema";
import { useI18n } from "@/features/i18n/provider";

export function AddFriendForm() {
  const { messages } = useI18n();
  const t = messages.social;
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
      setMessage({ type: "success", text: t.requestSent });
      reset();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t.requestFailed,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Input placeholder={t.addEmailPlaceholder} className="w-56" {...register("email")} />
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {t.addFriend}
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
