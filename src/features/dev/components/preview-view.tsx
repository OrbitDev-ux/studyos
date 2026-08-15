"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPreviewConnection } from "@/features/dev/runtime-actions";
import { useI18n } from "@/features/i18n/provider";

/** `/dev/preview` — iframes the container's dev server through the Dev
 * Runtime Backend's authenticated reverse proxy (§25/§26). The iframe never
 * points at a host port directly; `previewUrl` carries a short-lived,
 * workspace-scoped capability token the runtime verifies before proxying. */
export function PreviewView({ title }: { title: string }) {
  const { messages } = useI18n();
  const t = messages.dev;
  const [port, setPort] = useState("3000");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    const res = await getPreviewConnection(Number(port));
    if (res.error || !res.previewUrl) {
      setError(res.error ?? t.backendUnavailableDesc);
      return;
    }
    setPreviewUrl(res.previewUrl);
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
