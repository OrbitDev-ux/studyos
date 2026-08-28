"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/features/i18n/provider";

/**
 * `/dev/preview` — §17: no reverse proxy is needed here at all. The browser
 * and the Local Agent run on the SAME machine as the dev server the user
 * starts from `/dev/run`, so the preview is just an iframe pointed straight
 * at `http://localhost:<port>` (§17: "가능하면 localhost/127.0.0.1 기반으로
 * 접근한다") — StudyOS Web is never in this path at all.
 */
export function PreviewView({ title }: { title: string }) {
  const { messages } = useI18n();
  const t = messages.dev;
  const [port, setPort] = useState("3000");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    const n = Number(port);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      setError("Invalid port.");
      return;
    }
    setPreviewUrl(`http://localhost:${n}`);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
          <Eye className="size-5" /> {title}
        </h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="preview-port" className="text-xs">
            {t.previewPortLabel}
          </Label>
          <Input
            id="preview-port"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-20 font-mono"
          />
          <Button type="button" size="sm" onClick={open}>
            {t.previewOpen}
          </Button>
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border">
        {previewUrl ? (
          <iframe src={previewUrl} className="h-full w-full" title={title} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {t.previewEmpty}
          </div>
        )}
      </div>
    </div>
  );
}
