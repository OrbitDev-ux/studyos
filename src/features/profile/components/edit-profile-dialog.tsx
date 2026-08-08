"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/features/profile/actions";
import {
  BIO_MAX,
  updateProfileSchema,
  type UpdateProfileValues,
} from "@/features/profile/schema";

/** Modal to edit the current user's own profile (nickname, status message,
 * avatar URL). On save it revalidates the app layout server-side and refreshes
 * the router so every surface — sidebar, chat lists, profile cards — updates
 * without a full page reload. */
export function EditProfileDialog({
  initial,
}: {
  initial: { nickname: string; bio: string; avatarUrl: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: initial,
  });

  // Reset to the latest server values whenever the dialog opens.
  useEffect(() => {
    if (open) {
      reset(initial);
      setServerError(null);
    }
  }, [open, initial, reset]);

  const avatarPreview = watch("avatarUrl");
  const nicknamePreview = watch("nickname");

  async function onSubmit(values: UpdateProfileValues) {
    setServerError(null);
    try {
      await updateProfile(values);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "저장에 실패했어요.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="size-3.5" /> 프로필 수정
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필 수정</DialogTitle>
          <DialogDescription>닉네임, 상태 메시지, 프로필 사진을 변경할 수 있어요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-14" size="lg">
              <AvatarImage src={avatarPreview || undefined} alt="" />
              <AvatarFallback className="text-lg">
                {(nicknamePreview || "?").at(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="avatarUrl">프로필 사진 URL</Label>
              <Input
                id="avatarUrl"
                placeholder="https://..."
                autoComplete="off"
                {...register("avatarUrl")}
              />
              {errors.avatarUrl && (
                <p className="text-destructive text-xs">{errors.avatarUrl.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nickname">닉네임</Label>
            <Input id="nickname" autoComplete="off" {...register("nickname")} />
            {errors.nickname && (
              <p className="text-destructive text-xs">{errors.nickname.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">상태 메시지</Label>
            <Textarea
              id="bio"
              rows={2}
              maxLength={BIO_MAX}
              placeholder="오늘도 공부 ㄱㄱ 📚"
              {...register("bio")}
            />
            {errors.bio && <p className="text-destructive text-xs">{errors.bio.message}</p>}
          </div>

          {serverError && <p className="text-destructive text-xs">{serverError}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
