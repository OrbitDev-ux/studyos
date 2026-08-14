"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createTicket } from "@/features/support/actions";
import { SUPPORT_TYPES, supportTypeLabel } from "@/features/support/constants";
import type { SupportTicketType } from "@/generated/prisma/client";
import { useI18n } from "@/features/i18n/provider";

/** "새 문의 작성" — Dialog + form. Loading/success/error/validation states. */
export function NewTicketDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const { messages } = useI18n();
  const t = messages.support;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<SupportTicketType>("BUG");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError(t.validationRequired);
      return;
    }
    startTransition(async () => {
      const res = await createTicket({ type, title, content });
      if (res.error) {
        setError(res.error);
        return;
      }
      toast({
        title: t.submittedTitle,
        description: t.submittedDesc,
      });
      setOpen(false);
      setTitle("");
      setContent("");
      if (res.ticketId) router.push(`/support/${res.ticketId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> {t.newTicket}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-type">{t.typeLabel}</Label>
            <Select value={type} onValueChange={(v) => setType(v as SupportTicketType)}>
              <SelectTrigger id="ticket-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_TYPES.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {supportTypeLabel(t, option.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-title">{t.titleLabel}</Label>
            <Input
              id="ticket-title"
              value={title}
              maxLength={120}
              placeholder={t.titlePlaceholder}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-content">{t.contentLabel}</Label>
            <Textarea
              id="ticket-content"
              value={content}
              rows={6}
              maxLength={5000}
              placeholder={t.contentPlaceholder}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="button" onClick={submit} disabled={pending} className="self-end">
            {pending ? t.submitting : t.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
