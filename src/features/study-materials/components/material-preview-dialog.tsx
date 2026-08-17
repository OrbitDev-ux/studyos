"use client";

import { Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/features/i18n/provider";
import { getMaterialDownloadUrl } from "@/features/study-materials/actions";
import type { MaterialType } from "@/features/study-materials/constants";

type Stage = "loading" | "ready" | "error";

export function MaterialPreviewDialog({
  material,
  open,
  onOpenChange,
}: {
  material: { id: string; name: string; type: string; mimeType: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages } = useI18n();
  const t = messages.materials;

  const [stage, setStage] = useState<Stage>("loading");
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStage("loading");
    setUrl(null);
    setText(null);

    getMaterialDownloadUrl(material.id)
      .then(async (signedUrl) => {
        if (cancelled) return;
        setUrl(signedUrl);
        if (
          (material.type as MaterialType) === "TXT" ||
          (material.type as MaterialType) === "MD"
        ) {
          const res = await fetch(signedUrl);
          if (cancelled) return;
          setText(await res.text());
        }
        if (!cancelled) setStage("ready");
      })
      .catch(() => {
        if (!cancelled) setStage("error");
      });

    return () => {
      cancelled = true;
    };
  }, [open, material.id, material.type]);

  const type = material.type as MaterialType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate">{material.name}</DialogTitle>
        </DialogHeader>

        {stage === "loading" && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="text-muted-foreground size-6 animate-spin" />
          </div>
        )}

        {stage === "error" && (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted-foreground text-sm">{t.previewError}</p>
          </div>
        )}

        {stage === "ready" && url && (
          <div className="flex flex-col gap-3">
            {type === "PDF" && (
              <iframe
                src={url}
                title={material.name}
                className="h-[70vh] w-full rounded-md border"
              />
            )}
            {type === "IMAGE" && (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL, not a static/optimizable asset
              <img
                src={url}
                alt={material.name}
                className="max-h-[70vh] w-full rounded-md border object-contain"
              />
            )}
            {(type === "TXT" || type === "MD") && (
              <pre className="bg-muted max-h-[70vh] overflow-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
                {text}
              </pre>
            )}
            {type !== "PDF" && type !== "IMAGE" && type !== "TXT" && type !== "MD" && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {t.previewUnsupported}
              </p>
            )}

            <Button
              asChild
              variant="outline"
              size="sm"
              className="self-start"
              data-icon="inline-start"
            >
              <a href={url} download={material.name}>
                <Download className="size-4" />
                {t.download}
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
